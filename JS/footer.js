const footerBasePrefix = window.location.pathname.includes("/html/") ? ".." : ".";

function encodeEmailForLink(email) {
  try {
    return window.btoa(email);
  } catch (err) {
    return "";
  }
}

function decodeEmailForLink(encoded) {
  try {
    return window.atob(encoded);
  } catch (err) {
    return "";
  }
}

function attachObfuscatedMailto(anchor, email) {
  const encoded = encodeEmailForLink(email);
  if (!encoded) return;

  anchor.href = "#";
  anchor.addEventListener("click", (e) => {
    e.preventDefault();
    const decoded = decodeEmailForLink(encoded);
    if (decoded) {
      window.location.href = `mailto:${decoded}`;
    }
  });
}

function textToLink(text, options) {
  const span = document.createElement("span");
  const config =
    typeof options === "string" ? { href: options } : options || {};

  const href = config.href || "";
  const email = config.email || "";

  if (!href && !email) {
    span.textContent = text;
    return span;
  }

  const anchor = document.createElement("a");
  anchor.textContent = text;

  if (email) {
    attachObfuscatedMailto(anchor, email);
  } else {
    anchor.href = href;
    if (href.startsWith("http")) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
  }

  span.appendChild(anchor);
  return span;
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Failed to load " + path);
  }
  return response.text();
}

function findWebsite(text) {
  const match = text.match(/Website:\s*(\S+)/i);
  return match ? match[1].trim() : "";
}

function findEmail(text) {
  const match = text.match(/Email[:：]\s*([^\s]+)/i);
  return match ? match[1].trim() : "";
}

async function buildPersonLink(name, { preferEmail = false } = {}) {
  const folder = name.trim().replace(/\s+/g, "_");
  const introPath = `${footerBasePrefix}/Resources/people/${folder}/intro.txt`;

  try {
    const intro = await fetchText(introPath);
    const website = findWebsite(intro);
    const email = findEmail(intro);
    const safeWebsite =
      website && /^https?:\/\//i.test(website) ? website : "";

    if (preferEmail && email) {
      return textToLink(name, { email });
    }
    if (safeWebsite) {
      return textToLink(name, { href: safeWebsite });
    }
    if (email) {
      return textToLink(name, { email });
    }
    return textToLink(name, {});
  } catch (err) {
    return textToLink(name, {});
  }
}

async function loadCreator() {
  const container = document.getElementById("footer-contributor");
  if (!container) return;
  const linkEl = await buildPersonLink("Fei Song");
  container.textContent = "";
  container.appendChild(linkEl);
}

async function getMaintainerNames() {
  const files = [
    `${footerBasePrefix}/Resources/Maintainer/maintainers.txt`,
    `${footerBasePrefix}/Resources/Maintainer/maintainer.txt`,
  ];

  for (const path of files) {
    try {
      const content = (await fetchText(path)).trim();
      if (content) {
        return content
          .split(/\r?\n/)
          .map((name) => name.trim())
          .filter(Boolean);
      }
    } catch (err) {
      continue;
    }
  }

  return [];
}

async function loadMaintainers() {
  const container = document.getElementById("footer-maintainers");
  if (!container) return;

  const names = await getMaintainerNames();
  if (!names.length) return; // 留白等待后续维护者填写

  container.textContent = "";
  const fragments = document.createDocumentFragment();

  for (let i = 0; i < names.length; i++) {
    if (i > 0) {
      fragments.appendChild(document.createTextNode(", "));
    }
    const linkEl = await buildPersonLink(names[i], { preferEmail: true });
    fragments.appendChild(linkEl);
  }

  container.appendChild(fragments);
}

document.addEventListener("DOMContentLoaded", () => {
  loadCreator();
  loadMaintainers();
});
