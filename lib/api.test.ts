import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiActualizarCheckSap,
  apiDescargarArchivo,
  apiDescargarTipo,
  apiImportarCdr,
  apiSireSync,
  conDetalle,
  mapArchivo,
  mapComprobante,
  mapEmpresa,
  type ApiComprobante,
  type ApiDetalle,
} from "./api";
import { comprobante } from "./pruebas-utiles";

const base: ApiComprobante = {
  id: "abc",
  company_id: "emp",
  origen: "emitido",
  ruc_emisor: "20514831620",
  ruc_receptor: "20987654321",
  razon_social_emisor: "TDM",
  razon_social_receptor: "CLIENTE SAC",
  tipo_documento: "01",
  serie: "F001",
  correlativo: 7,
  numero: "00000007",
  nombre_archivo: "20514831620-01-F001-00000007",
  fecha_emision: "2026-09-02",
  moneda: "PEN",
  monto_total: "118.00",
  estado: "aprobado",
  estado_label: "Aprobado",
  sunat_ambiente: "prod",
  n_sap: null,
  orden_compra: null,
  check_sap: false,
  cdr_codigo: null,
  cdr_descripcion: null,
};

describe("mapComprobante", () => {
  it("convierte una factura emitida y deriva base e IGV del total", () => {
    const c = mapComprobante(base);
    expect(c).toMatchObject({
      numero: "F001-00000007",
      tipo: "Factura",
      codigoTipo: "01",
      total: 118,
      baseImponible: 100,
      igv: 18,
      estadoSunat: "Aprobado",
      moneda: "PEN",
      fechaVencimiento: null,
      formaPago: null,
      fuente: "xml",
      tieneXml: false,
      tieneCdr: false,
      tienePdf: false,
    });
    expect(c.cliente).toEqual({ ruc: "20987654321", razonSocial: "CLIENTE SAC" });
  });

  it("en una compra la contraparte es el proveedor", () => {
    const c = mapComprobante({ ...base, origen: "recibido" });
    expect(c.cliente).toEqual({ ruc: "20514831620", razonSocial: "TDM" });
  });

  it("respeta los respaldos, la fuente y los datos de pago que informa el backend", () => {
    const c = mapComprobante({
      ...base,
      tipo_documento: "07",
      moneda: "USD",
      fuente: "sire",
      fecha_vencimiento: "2026-11-04",
      forma_pago: "Crédito 30 días",
      tiene_xml: true,
      tiene_cdr: true,
      tiene_pdf: false,
      estado: "anulado",
    });
    expect(c).toMatchObject({
      tipo: "Nota de Crédito",
      moneda: "USD",
      fuente: "sire",
      fechaVencimiento: "2026-11-04",
      formaPago: "Crédito 30 días",
      tieneXml: true,
      tieneCdr: true,
      tienePdf: false,
      estadoSunat: "Anulado",
    });
  });

  it("tolera montos y estados desconocidos", () => {
    const c = mapComprobante({ ...base, monto_total: null, estado: "raro", moneda: "" });
    expect(c.total).toBe(0);
    expect(c.estadoSunat).toBe("Pendiente");
    expect(c.moneda).toBe("PEN");
  });
});

describe("conDetalle y mapeos", () => {
  const detalle: ApiDetalle = {
    ...base,
    tiene_xml: true,
    items: [
      {
        item_nro: 1,
        descripcion: "Asfalto",
        cantidad: "2.00",
        unidad_medida: null,
        codigo: null,
        valor_unitario: null,
        precio_unitario: "50.00",
        descuento: "0",
        igv: "18",
        isc: "0",
        tip_afectacion_igv: null,
        total: "100.00",
      },
    ],
  };

  it("recalcula base e IGV con los ítems reales y actualiza los respaldos", () => {
    const c = conDetalle(comprobante({ total: 118, tieneXml: false }), detalle);
    expect(c.items).toEqual([
      { descripcion: "Asfalto", cantidad: 2, unidad: "NIU", precioUnitario: 50, baseImponible: 100 },
    ]);
    expect(c.baseImponible).toBe(100);
    expect(c.igv).toBe(18);
    expect(c.tieneXml).toBe(true);
  });

  it("sin ítems conserva la cabecera", () => {
    const original = comprobante({ baseImponible: 90, igv: 10 });
    const c = conDetalle(original, { ...detalle, items: [] });
    expect(c.baseImponible).toBe(90);
    expect(c.items).toEqual([]);
  });

  it("mapArchivo y mapEmpresa", () => {
    expect(
      mapArchivo({
        id: "a1",
        comprobante_id: null,
        tipo: "zip",
        nombre: "x.zip",
        mime_type: null,
        size_bytes: 10,
        hash_sha256: "abc",
        estado: "subido",
        subido_at: "2026-10-15T11:45:00Z",
        created_at: null,
      }),
    ).toEqual({
      id: "a1",
      tipo: "zip",
      nombre: "x.zip",
      tamano: 10,
      hashSha256: "abc",
      creado: "2026-10-15T11:45:00Z",
    });
    expect(
      mapEmpresa({
        id: "e",
        ruc: "20514831620",
        razon_social: "TDM ASFALTOS S.A.C.",
        nombre_comercial: null,
        activo: true,
        sunat_ambiente: "prod",
        rol: "emisor",
      }),
    ).toMatchObject({ nombreCorto: "TDM ASFALTOS S.A.C.", rol: "emisor", ambiente: "prod" });
  });
});

function respuesta(cuerpo: unknown, status = 200, cabeceras: Record<string, string> = {}) {
  return new Response(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...cabeceras },
  });
}

describe("llamadas a la API", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("envía el JWT y traduce el error uniforme del backend", async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta({ error: { code: "forbidden", message: "Su rol no lo permite" } }, 403),
    );
    const error = await apiActualizarCheckSap("TOKEN", "id-1", true).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "forbidden", status: 403, message: "Su rol no lo permite" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/comprobantes/id-1");
    expect(init.headers.Authorization).toBe("Bearer TOKEN");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ check_sap: true });
  });

  it("una caída de red se informa como sin_conexion", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const error = await apiActualizarCheckSap("T", "x", true).catch((e) => e);
    expect(error).toMatchObject({ code: "sin_conexion", status: 0 });
  });

  it("un error que no es JSON (502 del proxy) usa el texto de estado", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }));
    const error = await apiActualizarCheckSap("T", "x", true).catch((e) => e);
    expect(error).toMatchObject({ status: 502, message: "Bad Gateway" });
  });

  it("apiImportarCdr sube el ZIP como `paquete` a la empresa indicada", async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta({ ruc: "20514831620", total: 1, asociados: 1, ya_tenian: 0, sin_comprobante: 0, con_error: 0, items: [] }),
    );
    const archivo = new File(["PK"], "cdrs.zip", { type: "application/zip" });

    const r = await apiImportarCdr("T", "20514831620", archivo);

    expect(r.asociados).toBe(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/companies/20514831620/comprobantes/import-cdr");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("paquete")).toBeInstanceOf(File);
  });

  it("apiSireSync envía el ticket solo cuando se retoma", async () => {
    fetchMock.mockImplementation(async () => respuesta({ estado: "completado" }));
    await apiSireSync("T", "205", "202609");
    await apiSireSync("T", "205", "202609", "20260300000071");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ periodo: "202609" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      periodo: "202609",
      ticket: "20260300000071",
    });
  });

  it("apiDescargarTipo explica qué hacer cuando no hay XML archivado", async () => {
    fetchMock.mockResolvedValueOnce(respuesta({ comprobante_id: "c", items: [], total: 0 }));
    const error = await apiDescargarTipo("T", "c", "xml").catch((e) => e);
    expect(error).toMatchObject({ code: "archivo_no_encontrado", status: 404 });
    expect(error.message).toMatch(/Impórtalo/);
  });

  it("apiDescargarArchivo pide la URL firmada y baja el contenido", async () => {
    fetchMock
      .mockResolvedValueOnce(respuesta({ archivo_id: "a", nombre: "x.xml", url: "https://r2.test/firmada", expires_in: 900 }))
      .mockResolvedValueOnce(new Response("<xml/>", { status: 200 }));

    const { blob, nombre } = await apiDescargarArchivo("T", { id: "a", nombre: "x.xml" });

    expect(nombre).toBe("x.xml");
    expect(await blob.text()).toBe("<xml/>");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/archivos/a/download-url");
    expect(fetchMock.mock.calls[1][0]).toBe("https://r2.test/firmada");
  });

  it("si el almacenamiento bloquea la lectura se avisa con un mensaje claro", async () => {
    fetchMock
      .mockResolvedValueOnce(respuesta({ archivo_id: "a", nombre: "x", url: "https://r2.test/f", expires_in: 900 }))
      .mockRejectedValueOnce(new TypeError("CORS"));
    const error = await apiDescargarArchivo("T", { id: "a", nombre: "x" }).catch((e) => e);
    expect(error).toMatchObject({ code: "descarga_bloqueada" });
  });
});
