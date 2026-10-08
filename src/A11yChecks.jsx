// Pass / fail rows for the accessibility checks; used by the docs and the canvas badge.
const STATUS = { pass: "Pass", fail: "Fail", warn: "Check" };

export function StatusPill({ status }) {
  return <span className={`a11y-pill is-${status}`}>{STATUS[status]}</span>;
}

export function ChecksTable({ checks }) {
  return (
    <table className="a11y-table">
      <thead className="sr-only">
        <tr><th>Check</th><th>WCAG</th><th>Result</th><th>Status</th></tr>
      </thead>
      <tbody>
        {checks.map((c) => (
          <tr key={c.id}>
            <td>
              {c.label}
              {c.detail && <span className="a11y-detail">{c.detail}</span>}
            </td>
            <td className="a11y-crit">{c.criterion}</td>
            <td className="a11y-value">{c.value}</td>
            <td><StatusPill status={c.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function summaryText({ fail, warn }) {
  if (!fail && !warn) return "All checks pass";
  return [fail && `${fail} ${fail === 1 ? "issue" : "issues"}`, warn && `${warn} to check`].filter(Boolean).join(", ");
}
