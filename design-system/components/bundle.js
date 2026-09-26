/* @ds-bundle: {"format":4,"namespace":"PanicWonder","components":[{"name":"EventCard"},{"name":"EventRow"},{"name":"ReactionMark"}]} */
(function () {
  var ERAS = [
    { id: "antiquity", name: "Antiquity", from: -3000, to: 499 },
    { id: "medieval", name: "Medieval", from: 500, to: 1449 },
    { id: "print", name: "Print Age", from: 1450, to: 1779 },
    { id: "industrial", name: "Industrial", from: 1780, to: 1899 },
    { id: "machine", name: "Machine Age", from: 1900, to: 1944 },
    { id: "atomic", name: "Atomic", from: 1945, to: 1969 },
    { id: "analog", name: "Analog", from: 1970, to: 1989 },
    { id: "digital", name: "Digital", from: 1990, to: 9999 }
  ];
  var REACTIONS = {
    panic:   { label: "Panic", path: "M10 0l2.2 5.6L18 3.4l-2.6 5.2L20 11l-5.8 1.3 1.6 6.1-5.8-3.3L4.2 18.4l1.6-6.1L0 11l4.6-2.4L2 3.4l5.8 2.2z" },
    concern: { label: "Credible concern", path: "M10 1.5L19.5 18.5H0.5z" },
    wonder:  { label: "Wonder", path: "M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" },
    hope:    { label: "Optimism", path: "M1 16a9 9 0 0 1 18 0zM0 17.5h20V20H0z" }
  };
  var VERDICTS = { vindicated: "Vindicated", overblown: "Overblown", mixed: "Mixed", open: "Still out" };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function eraForYear(y) { for (var i = 0; i < ERAS.length; i++) if (y >= ERAS[i].from && y <= ERAS[i].to) return ERAS[i]; return ERAS[ERAS.length - 1]; }
  function formatYear(y) { return y < 0 ? (-y) + " BC" : y < 1000 ? y + " AD" : String(y); }
  function markSVG(reaction) {
    var r = REACTIONS[reaction]; if (!r) return "";
    return '<svg class="pw-mark pw-mark--' + reaction + '" viewBox="0 0 20 20" aria-hidden="true"><path d="' + r.path + '"/></svg>';
  }
  function ReactionMark(reaction) {
    var r = REACTIONS[reaction]; if (!r) return "";
    return '<span class="pw-reaction">' + markSVG(reaction) + esc(r.label) + '</span>';
  }
  function EventCard(ev) {
    var tags = (ev.tags || []).map(function (t) { return '<span class="pw-tag">' + esc(t) + '</span>'; }).join("");
    var verdict = ev.verdict ? '<span class="pw-verdict">' + esc(VERDICTS[ev.verdict] || ev.verdict) + '</span>' : "";
    return '<article class="pw-card" tabindex="0">' +
      '<div class="pw-card__head">' + ReactionMark(ev.reaction) + '<span class="pw-card__year">' + esc(formatYear(ev.year)) + '</span></div>' +
      '<h3 class="pw-card__title">' + esc(ev.title) + '</h3>' +
      '<p class="pw-card__body">' + esc(ev.body) + '</p>' +
      '<div class="pw-card__foot">' + tags + verdict + '</div></article>';
  }
  function EventRow(ev) {
    var r = REACTIONS[ev.reaction] || { label: "" };
    var tags = (ev.tags || []).map(function (t) { return '<span class="pw-tag">' + esc(t) + '</span>'; }).join("");
    var verdict = ev.verdict ? '<span class="pw-verdict">' + esc(VERDICTS[ev.verdict] || ev.verdict) + '</span>' : "";
    return '<details class="pw-row"><summary>' +
      '<span class="pw-row__meta">' + esc(r.label) + ' \u00b7 ' + esc(formatYear(ev.year)) + '</span>' +
      '<span class="pw-row__mark">' + markSVG(ev.reaction) + '</span>' +
      '<span class="pw-row__title">' + esc(ev.title) + '</span></summary>' +
      '<div class="pw-row__more"><p>' + esc(ev.body) + '</p><div class="pw-card__foot">' + tags + verdict + '</div></div></details>';
  }
  window.PanicWonder = { ERAS: ERAS, REACTIONS: REACTIONS, VERDICTS: VERDICTS, eraForYear: eraForYear, formatYear: formatYear, markSVG: markSVG, ReactionMark: ReactionMark, EventCard: EventCard, EventRow: EventRow };
})();
