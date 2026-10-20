export function AccessibleDataSummary({ caption, columns, rows }: {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="accessible-data-summary" data-accessible-summary="true">
      <table>
        <caption>{caption}</caption>
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{value}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
