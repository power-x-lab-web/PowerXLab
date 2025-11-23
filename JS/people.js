// ------- 名字 -> 目录名、资源路径 -------
function nameToFolder(name) {
  return name.trim().replace(/\s+/g, "_"); // "Yan Lu" -> "Yan_Lu"
}

function buildAssetsForPerson(name) {
  var folder = "../Resources/people/" + nameToFolder(name) + "/";
  return {
    photoUrl: folder + "photo.jpg",
    introUrl: folder + "intro.txt",
    pubUrl: folder + "pub.txt"
  };
}

// ------- 解析 people.txt -------

function parsePeopleText(text) {
  var lines = text.split(/\r?\n/);
  var sectionMap = {
    "principal investigator": "pi",
    "postdoc researcher": "postdoc",
    "graduate students": "graduate",
    "bachelor intership & visiting scholar": "bachelor_visiting",
    "alumni": "alumni"
    // Staff 目前 people.html 没有对应 container，这里先不渲染
  };

  var data = {
    pi: [],
    postdoc: [],
    graduate: [],
    bachelor_visiting: [],
    alumni: []
  };

  var currentSection = null;

  lines.forEach(function (raw) {
    var line = raw.trim();
    if (!line) return;

    // 标题行，以冒号结尾，例如 "Principal Investigator:"
    if (/:$/.test(line)) {
      var key = line.replace(/:$/, "").trim().toLowerCase();
      currentSection = key;
      return;
    }

    // 普通姓名行
    if (currentSection) {
      var group = sectionMap[currentSection];
      if (!group) return;
      var person = {
        name: line,
        role: currentSection // 原始标题名
      };
      data[group].push(person);
    }
  });

  return data;
}

// ------- 解析 intro.txt：增加 research interests 字段 -------
function parseIntroText(text) {
  var result = {
    position: "",
    scholar: "",
    email: "",
    linkedin: "",
    website: "",
    research: "",
    intro: ""
  };

  var lines = text.split(/\r?\n/);
  var currentField = null;
  var introLines = [];
  var researchLines = [];

  lines.forEach(function (rawLine) {
    var line = rawLine.trim();

    // 空行：只在正文里保留换行，其它字段直接跳过
    if (!line) {
      if (currentField === "intro") {
        introLines.push(""); // 保留空行
      } else if (currentField === "research") {
        researchLines.push("");
      }
      return;
    }

    // 字段标题
    if (/^Position:?$/i.test(line)) {
      currentField = "position";
      return;
    }
    if (/^Google\s+Scholar:?$/i.test(line)) {
      currentField = "scholar";
      return;
    }
    if (/^Email:?$/i.test(line)) {
      currentField = "email";
      return;
    }
    if (/^LinkedIn:?$/i.test(line)) {
      currentField = "linkedin";
      return;
    }
    if (/^Website:?$/i.test(line)) {
      currentField = "website";
      return;
    }
    if (/^Research\s+Interests?:?$/i.test(line)) {
      currentField = "research";
      return;
    }
    // Introducton / Introduction / Intro 都识别
    if (/^Intro/i.test(line)) {
      currentField = "intro";
      return;
    }

    // 根据当前字段写入内容
    if (currentField === "intro") {
      introLines.push(line);
      return;
    }
    if (currentField === "research") {
      researchLines.push(line);
      return;
    }

    // 单行字段（Position / Email / Website / LinkedIn / Scholar）
    if (currentField && !result[currentField]) {
      result[currentField] = line;
    }
  });

  result.intro = introLines.join("\n").trim();
  result.research = researchLines.join("\n").trim();

  return result;
}
// ------- 联系方式图标行（Email / Scholar / Website / LinkedIn） -------

function createLinksRow(person) {
  var hasEmail = !!person.email;
  var hasScholar = !!person.scholar;
  var hasWebsite = !!person.website;
  var hasLinkedin = !!person.linkedin;

  if (!hasEmail && !hasScholar && !hasWebsite && !hasLinkedin) {
    return null;
  }

  var container = document.createElement("div");
  container.className = "person-links";

  if (hasEmail) {
    var aMail = document.createElement("a");
    aMail.className = "icon-link";
    aMail.href = "mailto:" + person.email;

    var imgMail = document.createElement("img");
    imgMail.src = "../Resources/icons/email.svg";
    imgMail.alt = "Email";
    imgMail.className = "icon-image";

    aMail.appendChild(imgMail);
    container.appendChild(aMail);
  }

  if (hasScholar) {
    var aSch = document.createElement("a");
    aSch.className = "icon-link";
    aSch.href = person.scholar;
    aSch.target = "_blank";
    aSch.rel = "noopener";

    var imgSch = document.createElement("img");
    imgSch.src = "../Resources/icons/scholar.svg";
    imgSch.alt = "Google Scholar";
    imgSch.className = "icon-image";

    aSch.appendChild(imgSch);
    container.appendChild(aSch);
  }

  if (hasWebsite) {
    var aWeb = document.createElement("a");
    aWeb.className = "icon-link";
    aWeb.href = person.website;
    aWeb.target = "_blank";
    aWeb.rel = "noopener";

    var imgWeb = document.createElement("img");
    imgWeb.src = "../Resources/icons/website.svg";
    imgWeb.alt = "Website";
    imgWeb.className = "icon-image";

    aWeb.appendChild(imgWeb);
    container.appendChild(aWeb);
  }

  if (hasLinkedin) {
    var aLn = document.createElement("a");
    aLn.className = "icon-link";
    aLn.href = person.linkedin;
    aLn.target = "_blank";
    aLn.rel = "noopener";

    var imgLn = document.createElement("img");
    imgLn.src = "../Resources/icons/linkedin.svg";
    imgLn.alt = "LinkedIn";
    imgLn.className = "icon-image";

    aLn.appendChild(imgLn);
    container.appendChild(aLn);
  }

  return container;
}

// ------- 抽屉：只允许同时打开一个 -------

var currentDrawerEl = null;
var currentDrawerCard = null;
var currentDrawerPerson = null;

function closeCurrentDrawer() {
  if (currentDrawerEl && currentDrawerEl.parentNode) {
    currentDrawerEl.parentNode.removeChild(currentDrawerEl);
  }
  if (currentDrawerCard) {
    currentDrawerCard.classList.remove("is-open");
  }
  currentDrawerEl = null;
  currentDrawerCard = null;
  currentDrawerPerson = null;
}

// 简单 BibTeX 解析 + 分类 + HTML 渲染
function pubTextToHtml(raw) {
  if (!raw || !raw.trim()) {
    return "<em>No publications available.</em>";
  }

  // 去掉 BOM
  raw = raw.replace(/^\uFEFF/, "");

  // 解析 BibTeX
  var entries = [];
  var entryRegex = /@(\w+)\s*\{([^,]+),([\s\S]*?)\}\s*(?=@|$)/g;
  var match;
  while ((match = entryRegex.exec(raw)) !== null) {
    var bibType = match[1].toLowerCase();
    var key = match[2].trim();
    var body = match[3];

    var fields = {};
    var fieldRegex = /(\w+)\s*=\s*\{([^}]*)\}/g;
    var fmatch;
    while ((fmatch = fieldRegex.exec(body)) !== null) {
      var fieldName = fmatch[1].toLowerCase();
      var value = fmatch[2].trim();
      // 去掉常见转义
      value = value.replace(/\\&/g, "&").replace(/\\_/g, "_");
      fields[fieldName] = value;
    }

    entries.push({
      bibType: bibType,
      key: key,
      fields: fields,
    });
  }

  // 如果解析失败，退回到原来的“纯文本 + DOI 链接”
  if (!entries.length) {
    return simplePubTextFallback(raw);
  }

  // 分类：journal / conference / book
  function classifyEntry(e) {
    var f = e.fields;
    var t = (f.type || "").toLowerCase();
    var bt = (e.bibType || "").toLowerCase();
    var hasJournal = !!f.journal;
    var hasBooktitle = !!f.booktitle;
    var hasPublisher = !!f.publisher;

    // Books
    if (
      t.indexOf("book") !== -1 ||
      t.indexOf("chapter") !== -1 ||
      bt === "book" ||
      bt === "inbook" ||
      bt === "incollection"
    ) {
      return "book";
    }

    // Journal
    if (
      t.indexOf("journal") !== -1 ||
      (bt === "article" && hasJournal)
    ) {
      return "journal";
    }

    // 其它默认归到 conference（包括 conference paper 等）
    return "conf";
  }

  // 排序：按年份降序
  entries.sort(function (a, b) {
    var ya = parseInt(a.fields.year || "0", 10) || 0;
    var yb = parseInt(b.fields.year || "0", 10) || 0;
    return yb - ya;
  });

  var groups = { journal: [], conf: [], book: [] };
  entries.forEach(function (e) {
    var cat = classifyEntry(e);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(e);
  });

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  // 单条 entry 的展示格式，尽量靠 publication 页风格
  function normalizeDoi(rawVal) {
    if (!rawVal) return "";
    var doi = String(rawVal).trim();
    doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    doi = doi.replace(/^doi:\s*/i, "");
    doi = doi.replace(/[)\].,;:]+$/g, "");
    return doi;
  }

  function extractDoi(f) {
    if (!f) return "";
    if (f.doi) return normalizeDoi(f.doi);
    if (f.url && /10\.\d/.test(f.url)) return normalizeDoi(f.url);
    var joined = [f.note, f.journal, f.booktitle, f.title]
      .filter(Boolean)
      .join(" ");
    var m = joined.match(/\b10\.\d{4,9}\/\S+\b/);
    return m ? normalizeDoi(m[0]) : "";
  }

  function formatEntry(e) {
    var f = e.fields;
    var authors = f.author || f.authors || "";
    var title = f.title || "";
    var venue = f.journal || f.booktitle || f.publisher || "";
    var year = f.year || "";
    var pages = f.pages || "";
    var citation = f.citation || f.url || "";
    var note = f.note || "";

    var doi = extractDoi(f);
    var link = doi
      ? "https://doi.org/" + encodeURIComponent(doi)
      : citation;

    var titleHtml = title ? '"' + escapeHtml(title) + '"' : "";

    var parts = [];
    if (authors) {
      parts.push(escapeHtml(authors));
    }
    if (titleHtml) {
      parts.push(titleHtml);
    }
    if (venue) {
      parts.push("<em>" + escapeHtml(venue) + "</em>");
    }
    if (pages) {
      parts.push("pp. " + escapeHtml(pages));
    }
    if (year) {
      parts.push(escapeHtml(year));
    }

    var body = parts.join(", ");
    if (body && body.slice(-1) !== ".") {
      body += ".";
    }
    return {
      text: body,
      link: link
    };
  }

  function renderGroup(title, list) {
    if (!list || !list.length) return "";
    var html = "";
    html += '<section class="person-pub-section">';
    html +=
      '<h4 class="section-title">' + escapeHtml(title) + "</h4>";
    html += '<ol class="pub-list">';
    list.forEach(function (e, idx) {
      var entry = formatEntry(e);
      var linkHtml = entry.link
        ? '<a class="pub-doi-link" href="' +
          escapeAttr(entry.link) +
          '" target="_blank" rel="noopener noreferrer" aria-label="Open publication link">' +
          '<img class="pub-doi-icon" src="../Resources/icons/link.svg" alt="Link icon" />' +
          "</a>"
        : "";
      html += '<li class="pub-item">';
      html += '<div class="pub-text">';
      html += '<span class="pub-index">[' + (idx + 1) + "]</span>";
      html += entry.text;
      html += linkHtml;
      html += "</div>";
      html += "</li>";
    });
    html += "</ol>";
    html += "</section>";
    return html;
  }

  var htmlParts = [];
  htmlParts.push(renderGroup("Journal Articles", groups.journal));
  htmlParts.push(renderGroup("Conference Papers", groups.conf));
  htmlParts.push(renderGroup("Books", groups.book));

  var finalHtml = htmlParts.join("");

  if (!finalHtml.trim()) {
    // 如果解析后啥都没渲染出来，就退回纯文本模式
    return simplePubTextFallback(raw);
  }
  return finalHtml;
}

// 旧逻辑：纯文本 + DOI 自动链接的兜底方案
function simplePubTextFallback(raw) {
  var escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  var doiRegex = /\b(10\.\d{4,9}\/\S*?)([)\].,;:]?)(?=\s|$)/g;
  var linked = escaped.replace(doiRegex, function (_, doi, punct) {
    var clean = doi
      .trim()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    var url = "https://doi.org/" + clean;
    return (
      '<a href="' +
      url +
      '" target="_blank" rel="noopener noreferrer">' +
      clean +
      "</a>" +
      (punct || "")
    );
  });

  return linked.replace(/\r?\n/g, "<br/>");
}

// 打开某个人的抽屉（点击头像触发）
function openDrawerForPerson(person, card) {
  // 再次点击同一个，关闭
  if (currentDrawerCard === card) {
    closeCurrentDrawer();
    return;
  }

  // 先关闭之前的
  closeCurrentDrawer();

  card.classList.add("is-open");
  currentDrawerCard = card;
  currentDrawerPerson = person;

  var drawer = document.createElement("div");
  drawer.className = "person-drawer person-drawer-row";

  var inner = document.createElement("div");
  inner.className = "person-drawer-inner";

  // 简介
  if (person.intro) {
    var sec2 = document.createElement("div");
    sec2.className = "person-drawer-section";

    var secText2 = document.createElement("div");
    secText2.className = "person-drawer-text";
    secText2.textContent = person.intro;
    sec2.appendChild(secText2);

    inner.appendChild(sec2);
  }

  // Research Interests（在简介之后）
  if (person.research) {
    var sec1 = document.createElement("div");
    sec1.className = "person-drawer-section";

    var secTitle1 = document.createElement("div");
    secTitle1.className = "person-drawer-section-title";
    secTitle1.textContent = "Research Interests";
    sec1.appendChild(secTitle1);

    var secText1 = document.createElement("div");
    secText1.className = "person-drawer-text";
    secText1.textContent = person.research;
    sec1.appendChild(secText1);

    inner.appendChild(sec1);
  }

  // Publications：读取个人目录 pub.txt
  var sec3 = document.createElement("div");
  sec3.className = "person-drawer-section";

  var secTitle3 = document.createElement("div");
  secTitle3.className = "person-drawer-section-title";
  secTitle3.textContent = "Publications";
  sec3.appendChild(secTitle3);

  var pubsBody = document.createElement("div");
  pubsBody.className = "person-drawer-pubs";
  pubsBody.textContent = "Loading publications…";
  sec3.appendChild(pubsBody);

  inner.appendChild(sec3);

  drawer.appendChild(inner);

  // 插在当前卡片之后，作为单独一行铺满容器
  var parent = card.parentNode;
  if (parent) {
    var computed = window.getComputedStyle(parent);
    var colsStr = computed.gridTemplateColumns || "";
    var colCount = colsStr ? colsStr.split(/\s+/).filter(Boolean).length : 1;
    if (colCount < 1) colCount = 1;

    var cards = Array.prototype.filter.call(parent.children, function (el) {
      return el.classList && el.classList.contains("person-card");
    });

    var idx = cards.indexOf(card);
    var rowEndIdx = Math.min(
      cards.length - 1,
      Math.floor(idx / colCount) * colCount + (colCount - 1)
    );
    var insertAfterCard = cards[rowEndIdx] || card;
    var refNode = insertAfterCard.nextSibling;
    parent.insertBefore(drawer, refNode);
  }

  currentDrawerEl = drawer;

  // 延迟加载 pub.txt，并缓存
  if (person._pubLoaded && person._pubHtml != null) {
    pubsBody.innerHTML = person._pubHtml;
  } else if (person.pubUrl) {
    fetch(person.pubUrl)
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return res.text();
      })
      .then(function (txt) {
        var html = pubTextToHtml(txt);
        person._pubLoaded = true;
        person._pubHtml = html;
        pubsBody.innerHTML = html;
      })
      .catch(function () {
        pubsBody.textContent = "Failed to load publications.";
      });
  } else {
    pubsBody.innerHTML = "<em>No publications file.</em>";
  }
}

// ------- 卡片渲染：PI 与 非 PI -------

function createPersonCard(person) {
  var isPI =
    person.role &&
    person.role.toLowerCase().indexOf("principal investigator") === 0;

  if (isPI) {
    // PI：左图右文
    var card = document.createElement("div");
    card.className = "person-card pi-card";

    var imgWrap = document.createElement("div");
    imgWrap.className = "pi-photo-wrap";

    var img = document.createElement("img");
    img.className = "person-photo";
    img.src = person.photoUrl;
    img.alt = person.name;
    img.onerror = function () {
      this.style.display = "none";
    };
    imgWrap.appendChild(img);

    var info = document.createElement("div");
    info.className = "pi-info";

    var headerLine = document.createElement("div");
    headerLine.className = "person-header-line";

    var nameEl = document.createElement("div");
    nameEl.className = "person-name";
    nameEl.textContent = person.name;
    headerLine.appendChild(nameEl);

    var linksRow = createLinksRow(person);
    if (linksRow) {
      headerLine.appendChild(linksRow);
    }

    info.appendChild(headerLine);

    if (person.position) {
      var positionEl = document.createElement("div");
      positionEl.className = "person-position";
      positionEl.textContent = person.position;
      info.appendChild(positionEl);
    }

    if (person.intro) {
      var introEl = document.createElement("div");
      introEl.className = "person-intro";
      introEl.textContent = person.intro;
      info.appendChild(introEl);
    }

    card.appendChild(imgWrap);
    card.appendChild(info);

    return card;
  } else {
    // 非 PI：上图下文 + 点击头像展开抽屉
    var card2 = document.createElement("div");
    card2.className = "person-card";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "person-photo-button";

    var img2 = document.createElement("img");
    img2.className = "person-photo";
    img2.src = person.photoUrl;
    img2.alt = person.name;
    img2.onerror = function () {
      this.style.display = "none";
    };

    btn.appendChild(img2);
    card2.appendChild(btn);

    var basic = document.createElement("div");
    basic.className = "person-basic";

    var nameEl2 = document.createElement("div");
    nameEl2.className = "person-name";
    nameEl2.textContent = person.name;
    basic.appendChild(nameEl2);

    var positionEl2 = document.createElement("div");
    positionEl2.className = "person-position";
    positionEl2.textContent = person.position || "";
    basic.appendChild(positionEl2);

    var linksRow2 = createLinksRow(person);
    if (linksRow2) {
      basic.appendChild(linksRow2);
    }

    card2.appendChild(basic);

    // 只在点击头像时打开/关闭抽屉
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openDrawerForPerson(person, card2);
    });

    return card2;
  }
}

// ------- 加载 intro.txt -------

function loadIntroForPerson(person) {
  var assets = buildAssetsForPerson(person.name);
  person.photoUrl = assets.photoUrl;
  person.pubUrl = assets.pubUrl;

  return fetch(assets.introUrl)
    .then(function (res) {
      if (!res.ok) {
        person.intro = "";
        person.position = "";
        person.scholar = "";
        person.email = "";
        person.linkedin = "";
        person.website = "";
        person.research = "";
        return;
      }
      return res.text().then(function (txt) {
        var parsed = parseIntroText(txt);
        person.intro = parsed.intro;
        person.position = parsed.position;
        person.scholar = parsed.scholar;
        person.email = parsed.email;
        person.linkedin = parsed.linkedin;
        person.website = parsed.website;
        person.research = parsed.research;
      });
    })
    .catch(function () {
      person.intro = "";
      person.position = "";
      person.scholar = "";
      person.email = "";
      person.linkedin = "";
      person.website = "";
      person.research = "";
    });
}

// ------- 渲染到页面 -------

function renderPeople(data) {
  var piContainer = document.getElementById("pi-container");
  var postdocContainer = document.getElementById("postdoc-container");
  var graduateContainer = document.getElementById("graduate-container");
  var bachelorVisitingContainer = document.getElementById(
    "bachelor_visiting-container"
  );
  var alumniContainer = document.getElementById("alumni-container");

  [piContainer, postdocContainer, graduateContainer, bachelorVisitingContainer, alumniContainer].forEach(
    function (c) {
      if (c) c.innerHTML = "";
    }
  );

  // PI 一般只有一个，保持顺序
  data.pi.forEach(function (p) {
    piContainer.appendChild(createPersonCard(p));
  });

  data.postdoc.forEach(function (p) {
    postdocContainer.appendChild(createPersonCard(p));
  });

  data.graduate.forEach(function (p) {
    graduateContainer.appendChild(createPersonCard(p));
  });

  data.bachelor_visiting.forEach(function (p) {
    bachelorVisitingContainer.appendChild(createPersonCard(p));
  });

  data.alumni.forEach(function (p) {
    alumniContainer.appendChild(createPersonCard(p));
  });
}

// ------- 总入口：加载 people.txt -------

function loadPeople() {
  fetch("../Resources/people/people.txt")
    .then(function (res) {
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      return res.text();
    })
    .then(function (txt) {
      var parsed = parsePeopleText(txt);

      var allPersons = []
        .concat(
          parsed.pi,
          parsed.postdoc,
          parsed.graduate,
          parsed.bachelor_visiting,
          parsed.alumni
        );

      return Promise.all(allPersons.map(loadIntroForPerson)).then(function () {
        renderPeople(parsed);
      });
    })
    .catch(function (err) {
      console.error("Failed to load people.txt:", err);
    });
}

document.addEventListener("DOMContentLoaded", loadPeople);
