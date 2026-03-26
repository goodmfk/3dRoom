import { getLayoutDefinition, getLayoutDefinitions } from "./geometry-generator.js";

const DEFAULT_LENGTHS = {
  rectangle: [600, 400, 600, 400],
  "l-shape": [700, 300, 250, 250, 450, 550],
  "u-shape": [900, 500, 250, 250, 200, 250, 450, 500]
};

export function createUI({ onGenerate }) {
  const layoutSelect = document.getElementById("layoutSelect");
  const ceilingHeightInput = document.getElementById("ceilingHeight");
  const wallInputs = document.getElementById("wallInputs");
  const layoutHelp = document.getElementById("layoutHelp");
  const layoutBadge = document.getElementById("layoutBadge");
  const generateRoomBtn = document.getElementById("generateRoomBtn");

  const cachedLengths = JSON.parse(JSON.stringify(DEFAULT_LENGTHS));

  populateLayoutSelect();
  renderWallInputs(layoutSelect.value);
  updateLayoutMeta(layoutSelect.value);

  layoutSelect.addEventListener("change", () => {
    renderWallInputs(layoutSelect.value);
    updateLayoutMeta(layoutSelect.value);
  });

  generateRoomBtn.addEventListener("click", () => {
    onGenerate(getValues());
  });

  return {
    getValues
  };

  function getValues() {
    return {
      layout: layoutSelect.value,
      ceilingHeightCm: Number(ceilingHeightInput.value),
      wallLengthsCm: Array.from(wallInputs.querySelectorAll("input")).map((input) => Number(input.value))
    };
  }

  function populateLayoutSelect() {
    const definitions = getLayoutDefinitions();
    layoutSelect.innerHTML = definitions
      .map((definition) => `<option value="${definition.key}">${definition.label} (${definition.wallCount} walls)</option>`)
      .join("");
  }

  function renderWallInputs(layoutKey) {
    const definition = getLayoutDefinition(layoutKey);
    const values = cachedLengths[layoutKey] ?? definition.defaultLengthsCm;

    wallInputs.innerHTML = definition.walls
      .map((wall, index) => {
        const value = values[index] ?? definition.defaultLengthsCm[index];
        return `
          <div class="wall-field">
            <label for="wall-${index + 1}">${wall.label}</label>
            <input id="wall-${index + 1}" type="number" min="10" step="10" value="${value}">
            <p class="field-note">${wall.direction}</p>
          </div>
        `;
      })
      .join("");

    wallInputs.querySelectorAll("input").forEach((input, index) => {
      input.addEventListener("input", () => {
        cachedLengths[layoutKey][index] = Number(input.value);
      });
    });
  }

  function updateLayoutMeta(layoutKey) {
    const definition = getLayoutDefinition(layoutKey);
    layoutHelp.textContent = definition.helpText;
    layoutBadge.textContent = `${definition.wallCount} walls`;
  }
}
