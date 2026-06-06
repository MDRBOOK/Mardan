const STORAGE_KEY = "mimi-image-config";
const HISTORY_KEY = "mimi-image-history";
const USAGE_KEY = "mimi-image-usage";

const DEFAULT_CONFIG = {
  apiKey: "",
  model: "gpt-image-1.5",
  apiBase: "https://api.openai.com/v1/images/generations",
};

const ratios = [
  { label: "Auto", size: "auto", w: 1, h: 1 },
  { label: "1:1", size: "1024x1024", w: 1, h: 1 },
  { label: "3:2", size: "1536x1024", w: 3, h: 2 },
  { label: "2:3", size: "1024x1536", w: 2, h: 3 },
  { label: "16:9", size: "1536x864", w: 16, h: 9 },
  { label: "9:16", size: "864x1536", w: 9, h: 16 },
  { label: "4:3", size: "1280x960", w: 4, h: 3 },
  { label: "3:4", size: "960x1280", w: 3, h: 4 },
  { label: "5:4", size: "1280x1024", w: 5, h: 4 },
  { label: "4:5", size: "1024x1280", w: 4, h: 5 },
  { label: "2:1", size: "1536x768", w: 2, h: 1 },
  { label: "1:2", size: "768x1536", w: 1, h: 2 },
];

const els = {
  prompt: document.querySelector("#prompt"),
  tokenCount: document.querySelector("#tokenCount"),
  ratioGrid: document.querySelector("#ratioGrid"),
  qualityGroup: document.querySelector("#qualityGroup"),
  formatGroup: document.querySelector("#formatGroup"),
  compression: document.querySelector("#compression"),
  compressionValue: document.querySelector("#compressionValue"),
  imageCount: document.querySelector("#imageCount"),
  generateBtn: document.querySelector("#generateBtn"),
  statusText: document.querySelector("#statusText"),
  modelText: document.querySelector("#modelText"),
  imageGrid: document.querySelector("#imageGrid"),
  emptyState: document.querySelector("#emptyState"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  apiKey: document.querySelector("#apiKey"),
  modelName: document.querySelector("#modelName"),
  apiBase: document.querySelector("#apiBase"),
  forgetSettings: document.querySelector("#forgetSettings"),
  referenceInput: document.querySelector("#referenceInput"),
  referencePreview: document.querySelector("#referencePreview"),
  historyDialog: document.querySelector("#historyDialog"),
  historyList: document.querySelector("#historyList"),
  downloadAll: document.querySelector("#downloadAll"),
  inputTokens: document.querySelector("#inputTokens"),
  outputTokens: document.querySelector("#outputTokens"),
  totalTokens: document.querySelector("#totalTokens"),
};

let state = {
  ratio: ratios[3],
  quality: "medium",
  format: "jpeg",
  count: 1,
  references: [],
  results: [],
  usage: readJson(USAGE_KEY, { input: 0, output: 0 }),
  config: { ...DEFAULT_CONFIG, ...readJson(STORAGE_KEY, {}) },
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function estimateTokens(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const latinWords = (text.replace(/[\u4e00-\u9fa5]/g, " ").match(/[A-Za-z0-9_]+/g) || []).length;
  return Math.max(0, Math.ceil(chineseChars * 0.55 + latinWords * 0.75));
}

function renderRatios() {
  els.ratioGrid.innerHTML = "";
  ratios.forEach((ratio) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ratio-card";
    button.dataset.size = ratio.size;
    button.setAttribute("aria-label", ratio.label);
    const maxWidth = 29;
    const maxHeight = 24;
    const scale = Math.min(maxWidth / ratio.w, maxHeight / ratio.h);
    const width = ratio.label === "Auto" ? 22 : Math.max(8, ratio.w * scale);
    const height = ratio.label === "Auto" ? 22 : Math.max(8, ratio.h * scale);
    button.innerHTML = `<span class="ratio-icon" style="width:${width}px;height:${height}px"></span><span class="ratio-label">${ratio.label}</span>`;
    button.addEventListener("click", () => {
      state.ratio = ratio;
      renderRatios();
    });
    if (state.ratio.size === ratio.size && state.ratio.label === ratio.label) {
      button.classList.add("active");
    }
    els.ratioGrid.appendChild(button);
  });
}

function updatePromptStats() {
  const chars = els.prompt.value.length;
  const tokens = estimateTokens(els.prompt.value);
  els.tokenCount.textContent = `${chars} 字符，${tokens} Token`;
}

function updateUsage() {
  const total = state.usage.input + state.usage.output;
  els.inputTokens.textContent = state.usage.input;
  els.outputTokens.textContent = state.usage.output;
  els.totalTokens.textContent = total;
  saveJson(USAGE_KEY, state.usage);
}

function updateConfigUi() {
  els.apiKey.value = state.config.apiKey || "";
  els.modelName.value = state.config.model || DEFAULT_CONFIG.model;
  els.apiBase.value = state.config.apiBase || DEFAULT_CONFIG.apiBase;
  els.modelText.textContent = `模型：${state.config.model || "未配置"}`;
}

function setActiveButton(group, dataName, value) {
  group.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset[dataName] === value);
  });
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 3200);
}

function setBusy(isBusy, text = "") {
  els.generateBtn.disabled = isBusy;
  els.statusText.textContent = text || (isBusy ? "正在生成..." : "等待生成...");
}

function getHistory() {
  return readJson(HISTORY_KEY, []);
}

function addHistory(entry) {
  const next = [entry, ...getHistory()].slice(0, 20);
  saveJson(HISTORY_KEY, next);
}

function renderHistory() {
  const items = getHistory();
  els.historyList.innerHTML = "";
  if (!items.length) {
    els.historyList.innerHTML = '<p class="muted">还没有历史记录。</p>';
    return;
  }
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.innerHTML = `<strong>${new Date(item.createdAt).toLocaleString()}</strong><span>${escapeHtml(item.prompt)}</span>`;
    button.addEventListener("click", () => {
      els.prompt.value = item.prompt;
      updatePromptStats();
      els.historyDialog.close();
    });
    els.historyList.appendChild(button);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
  });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl) {
  return String(dataUrl).split(",")[1] || "";
}

async function updateReferences(files) {
  const next = [];
  for (const file of Array.from(files).slice(0, 4)) {
    const url = await fileToDataUrl(file);
    next.push({ name: file.name, type: file.type, url });
  }
  state.references = next;
  els.referencePreview.innerHTML = "";
  state.references.forEach((ref) => {
    const chip = document.createElement("div");
    chip.className = "reference-chip";
    chip.innerHTML = `<img src="${ref.url}" alt=""><span>${escapeHtml(ref.name)}</span>`;
    els.referencePreview.appendChild(chip);
  });
}

function imageMime() {
  return state.format === "jpeg" ? "image/jpeg" : `image/${state.format}`;
}

function imageExtension() {
  return state.format === "jpeg" ? "jpg" : state.format;
}

function createImageCard(index) {
  const template = document.querySelector("#imageCardTemplate");
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector(".image-wrap").innerHTML = '<div class="loader" aria-label="生成中"></div>';
  card.querySelector(".image-meta span").textContent = `图像 ${index + 1}`;
  return card;
}

function renderResults(placeholders = 0) {
  els.emptyState.hidden = true;
  els.imageGrid.hidden = false;
  els.imageGrid.innerHTML = "";
  if (placeholders) {
    for (let i = 0; i < placeholders; i += 1) {
      els.imageGrid.appendChild(createImageCard(i));
    }
    return;
  }
  state.results.forEach((result, index) => {
    const card = createImageCard(index);
    const wrap = card.querySelector(".image-wrap");
    const img = document.createElement("img");
    img.src = result.url;
    img.alt = `生成图像 ${index + 1}`;
    wrap.innerHTML = "";
    wrap.appendChild(img);
    const link = card.querySelector(".download-link");
    link.href = result.url;
    link.download = `mimi-image-${Date.now()}-${index + 1}.${imageExtension()}`;
    card.querySelector(".image-meta span").textContent = `${state.ratio.label} · ${state.quality.toUpperCase()} · ${state.format.toUpperCase()}`;
    els.imageGrid.appendChild(card);
  });
  els.downloadAll.disabled = state.results.length === 0;
}

function buildPayload(prompt) {
  const promptWithReferences = state.references.length
    ? `${prompt}\n\n参考图说明：用户上传了 ${state.references.length} 张参考图，请在构图、风格或主体特征上参考它们。`
    : prompt;
  const payload = {
    model: state.config.model || DEFAULT_CONFIG.model,
    prompt: promptWithReferences,
    n: state.count,
    size: state.ratio.size,
    quality: state.quality,
    output_format: state.format,
  };
  if (state.format !== "png") {
    payload.output_compression = Number(els.compression.value);
  }
  return payload;
}

function normalizeImages(json) {
  const data = Array.isArray(json.data) ? json.data : [];
  return data
    .map((item) => {
      if (item.url) return { url: item.url };
      const b64 = item.b64_json || item.image_base64;
      if (b64) return { url: `data:${imageMime()};base64,${b64}` };
      return null;
    })
    .filter(Boolean);
}

async function generateImages() {
  const prompt = els.prompt.value.trim();
  if (!prompt) {
    toast("请先输入提示词。");
    els.prompt.focus();
    return;
  }
  if (!state.config.apiKey) {
    toast("请先在设置里填写 OpenAI API Key。");
    els.settingsDialog.showModal();
    return;
  }

  setBusy(true, "正在提交任务...");
  renderResults(state.count);

  try {
    const response = await fetch(state.config.apiBase || DEFAULT_CONFIG.apiBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.config.apiKey}`,
      },
      body: JSON.stringify(buildPayload(prompt)),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = json.error?.message || json.message || `${response.status} ${response.statusText}`;
      throw new Error(detail);
    }

    const images = normalizeImages(json);
    if (!images.length) {
      throw new Error("接口没有返回可显示的图片数据。");
    }

    state.results = images;
    renderResults();
    const input = estimateTokens(prompt);
    const output = state.results.length * (state.quality === "high" ? 1413 : state.quality === "medium" ? 900 : 520);
    state.usage.input += input;
    state.usage.output += output;
    updateUsage();
    addHistory({ prompt, createdAt: Date.now(), count: state.results.length });
    setBusy(false, `已生成 ${state.results.length} 张图像`);
  } catch (error) {
    state.results = [];
    els.imageGrid.hidden = true;
    els.emptyState.hidden = false;
    els.downloadAll.disabled = true;
    setBusy(false, "生成失败");
    toast(`生成失败：${error.message}`);
  }
}

function downloadAll() {
  state.results.forEach((result, index) => {
    const link = document.createElement("a");
    link.href = result.url;
    link.download = `mimi-image-${Date.now()}-${index + 1}.${imageExtension()}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
}

document.querySelectorAll(".settings-open").forEach((button) => {
  button.addEventListener("click", () => els.settingsDialog.showModal());
});

els.settingsForm.addEventListener("submit", () => {
  state.config = {
    apiKey: els.apiKey.value.trim(),
    model: els.modelName.value.trim() || DEFAULT_CONFIG.model,
    apiBase: els.apiBase.value.trim() || DEFAULT_CONFIG.apiBase,
  };
  saveJson(STORAGE_KEY, state.config);
  updateConfigUi();
  toast("API 设置已保存。");
});

els.forgetSettings.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  state.config = { ...DEFAULT_CONFIG };
  updateConfigUi();
  toast("已清除本地 API 配置。");
});

els.prompt.addEventListener("input", updatePromptStats);
document.querySelector("#clearPrompt").addEventListener("click", () => {
  els.prompt.value = "";
  updatePromptStats();
});

document.querySelector("#samplePrompt").addEventListener("click", () => {
  els.prompt.value =
    "一只戴着银色耳机的白色长毛猫，坐在深夜的创意工作台前，屏幕发出柔和蓝紫光，桌面有草稿纸、胶片相机和一杯热茶，电影感布光，细腻毛发，高级商业插画风格。";
  updatePromptStats();
});

document.querySelector("#openHistory").addEventListener("click", () => {
  renderHistory();
  els.historyDialog.showModal();
});

els.qualityGroup.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-quality]");
  if (!button) return;
  state.quality = button.dataset.quality;
  setActiveButton(els.qualityGroup, "quality", state.quality);
});

els.formatGroup.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-format]");
  if (!button) return;
  state.format = button.dataset.format;
  setActiveButton(els.formatGroup, "format", state.format);
});

els.compression.addEventListener("input", () => {
  els.compressionValue.textContent = els.compression.value;
});

document.querySelector("#decreaseCount").addEventListener("click", () => {
  state.count = Math.max(1, state.count - 1);
  els.imageCount.textContent = state.count;
});

document.querySelector("#increaseCount").addEventListener("click", () => {
  state.count = Math.min(3, state.count + 1);
  els.imageCount.textContent = state.count;
});

els.referenceInput.addEventListener("change", (event) => updateReferences(event.target.files));
els.generateBtn.addEventListener("click", generateImages);
els.downloadAll.addEventListener("click", downloadAll);

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    generateImages();
  }
});

renderRatios();
updatePromptStats();
updateUsage();
updateConfigUi();
