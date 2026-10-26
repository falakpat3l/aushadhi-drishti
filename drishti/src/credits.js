// Attribution line at the bottom of the map. Every data source shown on the
// map adds its credit here, and the line always stays visible.
const credits = new Map();

export function addCredit(id, html) {
  credits.set(id, html);
  render();
}

function render() {
  const line = document.getElementById('credit-line');
  if (line) line.innerHTML = [...credits.values()].join(' · ');
}
