export type DutyElderCsvRow = {
  event_start_time: string;
  duty_elder: string;
};

function parseCsvRows(value: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === '"') {
      if (inQuotes && value[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && value[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((item) => item.trim())) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += character;
  }

  if (inQuotes) {
    throw new Error("Het CSV-bestand bevat een niet-afgesloten aanhalingsteken.");
  }

  row.push(field);
  if (row.some((item) => item.trim())) {
    rows.push(row);
  }

  return rows;
}

export async function parseDutyElderCsv(file: File): Promise<DutyElderCsvRow[]> {
  const text = (await file.text()).replace(/^\uFEFF/, "");
  const rows = parseCsvRows(text);
  const headers = rows[0]?.map((header) => header.trim()) ?? [];

  if (
    headers.length !== 2 ||
    headers[0] !== "event_start_time" ||
    headers[1] !== "duty_elder"
  ) {
    throw new Error(
      "Gebruik exact de kolommen event_start_time,duty_elder."
    );
  }

  const dataRows = rows.slice(1);
  dataRows.forEach((values, index) => {
    if (values.length !== 2) {
      const columnLabel = values.length === 1 ? "kolom" : "kolommen";
      throw new Error(
        `CSV-rij ${index + 2} bevat ${values.length} ${columnLabel}; verwacht er exact 2.`
      );
    }
  });

  return dataRows.map((values) => ({
    event_start_time: values[0]?.trim() ?? "",
    duty_elder: values[1]?.trim() ?? "",
  }));
}
