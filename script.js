(function () {
  "use strict";

  var STORAGE_KEY = "studyplanner-ai-v1";
  var INIT_KEY = "studyplanner-ai-initialized-v1";

  var TYPES = {
    revision: "📚 Révision",
    devoir: "📝 Devoir",
    projet: "💻 Projet",
    exercice: "📖 Exercice",
    presentation: "🎤 Présentation",
    autre: "📌 Autre"
  };

  var PRIORITES = {
    faible: "Faible",
    moyenne: "Moyenne",
    elevee: "Élevée"
  };

  var PRIORITE_RANG = { elevee: 0, moyenne: 1, faible: 2 };

  var state = { subjects: [], tasks: [], exams: [] };
  var confirmCallback = null;
  var toastTimer = null;

  function uid() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    var d = new Date();
    return toISODate(d);
  }

  function toISODate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function addDays(n) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return toISODate(d);
  }

  function parseDate(iso) {
    var parts = String(iso).split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  }

  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function daysUntil(iso) {
    var target = parseDate(iso);
    target.setHours(0, 0, 0, 0);
    var diff = target.getTime() - startOfToday().getTime();
    return Math.round(diff / 86400000);
  }

  function formatDateFr(iso) {
    try {
      return parseDate(iso).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch (e) {
      return iso;
    }
  }

  function joursLabel(n) {
    if (n === 0) return "Aujourd’hui";
    if (n === 1) return "Demain";
    if (n === -1) return "Hier";
    if (n < 0) return "Il y a " + Math.abs(n) + " jour" + (Math.abs(n) > 1 ? "s" : "");
    return "Dans " + n + " jour" + (n > 1 ? "s" : "");
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      var data = JSON.parse(raw);
      state.subjects = Array.isArray(data.subjects) ? data.subjects : [];
      state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      state.exams = Array.isArray(data.exams) ? data.exams : [];
      return true;
    } catch (e) {
      return false;
    }
  }

  function seedDemo() {
    var algo = { id: uid(), nom: "Algorithmique", enseignant: "Mme Lefevre", couleur: "#4f46e5" };
    var bdd = { id: uid(), nom: "Base de données", enseignant: "M. Haddad", couleur: "#0f9d8a" };
    var web = { id: uid(), nom: "Programmation Web", enseignant: "Mme Chen", couleur: "#c47a12" };
    var res = { id: uid(), nom: "Réseaux", enseignant: "M. Dubois", couleur: "#7c3aed" };

    state.subjects = [algo, bdd, web, res];
    state.tasks = [
      {
        id: uid(),
        titre: "Exercices chapitre 3",
        matiereId: algo.id,
        type: "exercice",
        date: addDays(3),
        priorite: "moyenne",
        description: "Parcours et complexité des algorithmes vus en TD.",
        terminee: false
      },
      {
        id: uid(),
        titre: "Terminer projet JavaScript",
        matiereId: web.id,
        type: "projet",
        date: addDays(5),
        priorite: "elevee",
        description: "Interface, localStorage et présentation du projet.",
        terminee: false
      },
      {
        id: uid(),
        titre: "Réviser SQL",
        matiereId: bdd.id,
        type: "revision",
        date: addDays(1),
        priorite: "elevee",
        description: "Jointures, agrégats et normalisation.",
        terminee: false
      },
      {
        id: uid(),
        titre: "Fiche protocoles TCP/IP",
        matiereId: res.id,
        type: "devoir",
        date: addDays(8),
        priorite: "faible",
        description: "Synthèse des couches réseau.",
        terminee: true
      }
    ];
    state.exams = [
      {
        id: uid(),
        nom: "Examen Base de données",
        matiereId: bdd.id,
        date: addDays(5),
        heure: "09:00",
        salle: "Amphi A"
      },
      {
        id: uid(),
        nom: "Contrôle Algorithmique",
        matiereId: algo.id,
        date: addDays(12),
        heure: "14:30",
        salle: "Salle 204"
      }
    ];
    save();
    localStorage.setItem(INIT_KEY, "1");
  }

  function getSubject(id) {
    for (var i = 0; i < state.subjects.length; i++) {
      if (state.subjects[i].id === id) return state.subjects[i];
    }
    return null;
  }

  function subjectName(id) {
    var s = getSubject(id);
    return s ? s.nom : "Matière inconnue";
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function showToast(message) {
    var el = qs("toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.hidden = true;
    }, 2600);
  }

  function openConfirm(message, onOk) {
    confirmCallback = onOk;
    qs("modal-texte").textContent = message;
    qs("overlay").hidden = false;
    qs("modal-ok").focus();
  }

  function closeConfirm() {
    confirmCallback = null;
    qs("overlay").hidden = true;
  }

  function fillSubjectSelects() {
    var options = state.subjects.map(function (s) {
      return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.nom) + "</option>";
    }).join("");

    qs("tache-matiere").innerHTML = state.subjects.length
      ? options
      : '<option value="">Ajoutez d’abord une matière</option>';
    qs("examen-matiere").innerHTML = state.subjects.length
      ? options
      : '<option value="">Ajoutez d’abord une matière</option>';

    var currentFilter = qs("filtre-matiere").value || "toutes";
    qs("filtre-matiere").innerHTML =
      '<option value="toutes">Toutes les matières</option>' + options;
    if (currentFilter && (currentFilter === "toutes" || getSubject(currentFilter))) {
      qs("filtre-matiere").value = currentFilter;
    }
  }

  function renderStats() {
    var todo = state.tasks.filter(function (t) { return !t.terminee; }).length;
    var done = state.tasks.filter(function (t) { return t.terminee; }).length;
    var exams = state.exams.filter(function (e) { return daysUntil(e.date) >= 0; }).length;
    qs("stat-matieres").textContent = String(state.subjects.length);
    qs("stat-todo").textContent = String(todo);
    qs("stat-done").textContent = String(done);
    qs("stat-examens").textContent = String(exams);
  }

  function renderProgress() {
    var total = state.tasks.length;
    var done = state.tasks.filter(function (t) { return t.terminee; }).length;
    var rest = total - done;
    var pct = total === 0 ? 0 : Math.round((done / total) * 100);
    qs("progress-chiffres").textContent =
      "Total : " + total + " · Terminées : " + done + " · Restantes : " + rest;
    qs("progress-pct").textContent = pct + " %";
    qs("barre-progression-fill").style.width = pct + "%";
    qs("barre-progression").setAttribute("aria-valuenow", String(pct));

    var msg;
    if (total === 0) msg = "Ajoutez vos premières tâches pour suivre votre progression.";
    else if (pct === 100) msg = "Excellent travail : toutes les tâches sont terminées.";
    else if (pct >= 75) msg = "Très bonne dynamique : vous êtes sur la bonne voie.";
    else if (pct >= 40) msg = "Bon rythme : continuez, le plus dur est souvent le démarrage.";
    else msg = "Chaque tâche terminée compte. Commencez par le Focus du jour.";
    qs("progress-message").textContent = msg;
  }

  function taskUrgencyScore(task) {
    if (task.terminee) return -1000;
    var days = daysUntil(task.date);
    var score = 0;
    if (days < 0) score += 80 + Math.min(20, Math.abs(days));
    else if (days === 0) score += 70;
    else if (days === 1) score += 60;
    else score += Math.max(0, 40 - days * 3);
    if (task.priorite === "elevee") score += 25;
    else if (task.priorite === "moyenne") score += 10;
    var linkedExam = state.exams.some(function (e) {
      return e.matiereId === task.matiereId && daysUntil(e.date) >= 0 && daysUntil(e.date) <= 7;
    });
    if (linkedExam) score += 20;
    return score;
  }

  function renderFocus() {
    var list = qs("liste-focus");
    var picks = state.tasks
      .filter(function (t) { return !t.terminee; })
      .slice()
      .sort(function (a, b) { return taskUrgencyScore(b) - taskUrgencyScore(a); })
      .slice(0, 3);

    if (!picks.length) {
      list.innerHTML = '<li class="empty">Aucune tâche en cours. Ajoutez un devoir ou une révision pour obtenir un focus.</li>';
      return;
    }

    list.innerHTML = picks.map(function (t, i) {
      var days = daysUntil(t.date);
      var exam = state.exams
        .filter(function (e) { return e.matiereId === t.matiereId && daysUntil(e.date) >= 0; })
        .sort(function (a, b) { return daysUntil(a.date) - daysUntil(b.date); })[0];
      var reason;
      if (days < 0) reason = "En retard (" + joursLabel(days) + ")";
      else if (days <= 1) reason = "À rendre " + joursLabel(days).toLowerCase();
      else if (exam && daysUntil(exam.date) <= 7) {
        reason = "Examen " + subjectName(t.matiereId) + " " + joursLabel(daysUntil(exam.date)).toLowerCase();
      } else if (t.priorite === "elevee") reason = "Priorité élevée";
      else reason = "Échéance " + joursLabel(days).toLowerCase();
      return (
        "<li><strong>" + (i + 1) + ". " + escapeHtml(t.titre) + "</strong>" +
        "<span>" + escapeHtml(subjectName(t.matiereId)) + " · " + escapeHtml(reason) + "</span></li>"
      );
    }).join("");
  }

  function renderSmart() {
    var recos = [];
    var open = state.tasks.filter(function (t) { return !t.terminee; });
    var upcomingExams = state.exams.filter(function (e) { return daysUntil(e.date) >= 0; });

    upcomingExams.forEach(function (e) {
      var d = daysUntil(e.date);
      var nomMat = subjectName(e.matiereId);
      if (d <= 2) {
        recos.push({ cls: "smart-urgent", text: "🔴 Votre examen de " + nomMat + " est " + joursLabel(d).toLowerCase() + ". Priorisez vos révisions." });
      } else if (d <= 7) {
        recos.push({ cls: "smart-warn", text: "🟠 L’examen « " + e.nom + " » approche (" + joursLabel(d).toLowerCase() + ")." });
      }
    });

    var late = open.filter(function (t) { return daysUntil(t.date) < 0; });
    if (late.length) {
      recos.push({
        cls: "smart-urgent",
        text: "🔴 " + late.length + " tâche" + (late.length > 1 ? "s sont" : " est") + " en retard. Traitez-les en priorité."
      });
    }

    var weekHigh = open.filter(function (t) {
      var d = daysUntil(t.date);
      return t.priorite === "elevee" && d >= 0 && d <= 7;
    });
    if (weekHigh.length >= 2) {
      recos.push({
        cls: "smart-warn",
        text: "🟠 Vous avez " + weekHigh.length + " tâches importantes à terminer cette semaine."
      });
    } else if (weekHigh.length === 1) {
      recos.push({
        cls: "smart-warn",
        text: "🟠 Une tâche prioritaire arrive cette semaine : « " + weekHigh[0].titre + " »."
      });
    }

    var bySubject = {};
    open.forEach(function (t) {
      bySubject[t.matiereId] = (bySubject[t.matiereId] || 0) + 1;
    });
    Object.keys(bySubject).forEach(function (id) {
      if (bySubject[id] >= 2) {
        recos.push({
          cls: "smart-info",
          text: "📚 Vous avez plusieurs tâches pour la matière " + subjectName(id) + ". Pensez à réserver une séance de révision."
        });
      }
    });

    if (!state.subjects.length) {
      recos.push({ cls: "smart-info", text: "🟢 Commencez par ajouter vos matières pour structurer votre semestre." });
    }

    if (!recos.length && open.length === 0 && upcomingExams.length === 0) {
      recos.push({ cls: "smart-ok", text: "🟢 Votre planning est actuellement bien organisé." });
    } else if (!recos.length) {
      recos.push({ cls: "smart-ok", text: "🟢 Votre planning est actuellement bien organisé. Conservez ce rythme." });
    }

    qs("liste-smart").innerHTML = recos.map(function (r) {
      return '<li class="' + r.cls + '">' + escapeHtml(r.text) + "</li>";
    }).join("");
  }

  function renderSubjects() {
    var box = qs("liste-matieres");
    if (!state.subjects.length) {
      box.innerHTML = '<p class="empty">Aucune matière pour le moment. Ajoutez-en une à gauche.</p>';
      return;
    }
    box.innerHTML = state.subjects.map(function (s) {
      return (
        '<article class="item">' +
          '<div class="item-head">' +
            "<div>" +
              '<p class="item-title"><span class="subject-dot" style="background:' + escapeHtml(s.couleur) + '"></span>' + escapeHtml(s.nom) + "</p>" +
              '<p class="item-meta">' + (s.enseignant ? "Enseignant : " + escapeHtml(s.enseignant) : "Enseignant non renseigné") + "</p>" +
            "</div>" +
          "</div>" +
          '<div class="item-actions">' +
            '<button type="button" class="btn btn-small btn-ghost" data-edit-subject="' + escapeHtml(s.id) + '">Modifier</button>' +
            '<button type="button" class="btn btn-small btn-danger" data-del-subject="' + escapeHtml(s.id) + '">Supprimer</button>' +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function filteredTasks() {
    var q = qs("recherche-taches").value.trim().toLowerCase();
    var mat = qs("filtre-matiere").value;
    var prio = qs("filtre-priorite").value;
    var statut = qs("filtre-statut").value;
    var tri = qs("tri-taches").value;

    var list = state.tasks.filter(function (t) {
      if (q && t.titre.toLowerCase().indexOf(q) === -1) return false;
      if (mat !== "toutes" && t.matiereId !== mat) return false;
      if (prio !== "toutes" && t.priorite !== prio) return false;
      if (statut === "a-faire" && t.terminee) return false;
      if (statut === "terminees" && !t.terminee) return false;
      return true;
    });

    list.sort(function (a, b) {
      if (tri === "date-proche") return parseDate(a.date) - parseDate(b.date);
      if (tri === "date-loin") return parseDate(b.date) - parseDate(a.date);
      if (tri === "priorite") return PRIORITE_RANG[a.priorite] - PRIORITE_RANG[b.priorite];
      if (tri === "matiere") return subjectName(a.matiereId).localeCompare(subjectName(b.matiereId), "fr");
      return 0;
    });
    return list;
  }

  function renderTasks() {
    var box = qs("liste-taches");
    var list = filteredTasks();
    if (!list.length) {
      box.innerHTML = '<p class="empty">Aucune tâche ne correspond à la recherche ou aux filtres.</p>';
      return;
    }
    box.innerHTML = list.map(function (t) {
      var s = getSubject(t.matiereId);
      var color = s ? s.couleur : "#94a3b8";
      return (
        '<article class="item' + (t.terminee ? " is-done" : "") + '">' +
          '<div class="item-head">' +
            "<div>" +
              '<p class="item-title"><span class="subject-dot" style="background:' + escapeHtml(color) + '"></span>' + escapeHtml(t.titre) + "</p>" +
              '<p class="item-meta">' + escapeHtml(subjectName(t.matiereId)) + " · " + formatDateFr(t.date) + " · " + joursLabel(daysUntil(t.date)) + "</p>" +
              (t.description ? '<p class="item-meta">' + escapeHtml(t.description) + "</p>" : "") +
            "</div>" +
          "</div>" +
          '<div class="badges">' +
            '<span class="badge badge-type">' + escapeHtml(TYPES[t.type] || t.type) + "</span>" +
            '<span class="badge badge-' + escapeHtml(t.priorite) + '">' + escapeHtml(PRIORITES[t.priorite]) + "</span>" +
            (t.terminee ? '<span class="badge badge-done">Terminée</span>' : "") +
          "</div>" +
          '<div class="item-actions">' +
            (t.terminee
              ? '<button type="button" class="btn btn-small btn-ghost" data-toggle-task="' + escapeHtml(t.id) + '">Remettre en cours</button>'
              : '<button type="button" class="btn btn-small btn-primary" data-toggle-task="' + escapeHtml(t.id) + '">Marquer comme terminée</button>') +
            '<button type="button" class="btn btn-small btn-ghost" data-edit-task="' + escapeHtml(t.id) + '">Modifier</button>' +
            '<button type="button" class="btn btn-small btn-danger" data-del-task="' + escapeHtml(t.id) + '">Supprimer</button>' +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function renderExams() {
    var box = qs("liste-examens");
    if (!state.exams.length) {
      box.innerHTML = '<p class="empty">Aucun examen enregistré.</p>';
      return;
    }
    var list = state.exams.slice().sort(function (a, b) {
      return parseDate(a.date) - parseDate(b.date);
    });
    box.innerHTML = list.map(function (e) {
      var d = daysUntil(e.date);
      var soon = d >= 0 && d <= 3;
      var s = getSubject(e.matiereId);
      var color = s ? s.couleur : "#94a3b8";
      var extra = [];
      if (e.heure) extra.push("Heure : " + e.heure);
      if (e.salle) extra.push("Salle : " + e.salle);
      return (
        '<article class="item' + (soon ? " exam-soon" : "") + '">' +
          '<div class="item-head">' +
            "<div>" +
              '<p class="item-title"><span class="subject-dot" style="background:' + escapeHtml(color) + '"></span>' + escapeHtml(e.nom) + "</p>" +
              '<p class="item-meta">' + escapeHtml(subjectName(e.matiereId)) + " · " + formatDateFr(e.date) + "</p>" +
              '<p class="item-meta"><strong>' + joursLabel(d) + "</strong>" + (extra.length ? " · " + escapeHtml(extra.join(" · ")) : "") + "</p>" +
            "</div>" +
          "</div>" +
          '<div class="item-actions">' +
            '<button type="button" class="btn btn-small btn-ghost" data-edit-exam="' + escapeHtml(e.id) + '">Modifier</button>' +
            '<button type="button" class="btn btn-small btn-danger" data-del-exam="' + escapeHtml(e.id) + '">Supprimer</button>' +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function renderPlanning() {
    var box = qs("timeline-planning");
    var events = [];
    state.tasks.filter(function (t) { return !t.terminee; }).forEach(function (t) {
      events.push({
        date: t.date,
        urgent: daysUntil(t.date) <= 2,
        title: t.titre,
        detail: TYPES[t.type] + " · " + subjectName(t.matiereId) + " · Priorité " + PRIORITES[t.priorite].toLowerCase()
      });
    });
    state.exams.forEach(function (e) {
      events.push({
        date: e.date,
        urgent: daysUntil(e.date) >= 0 && daysUntil(e.date) <= 3,
        title: e.nom,
        detail: "Examen · " + subjectName(e.matiereId) + (e.heure ? " · " + e.heure : "") + (e.salle ? " · " + e.salle : "")
      });
    });
    events = events.filter(function (ev) { return daysUntil(ev.date) >= -1; });
    events.sort(function (a, b) { return parseDate(a.date) - parseDate(b.date); });

    if (!events.length) {
      box.innerHTML = '<p class="empty">Rien à venir pour le moment. Ajoutez des tâches ou des examens.</p>';
      return;
    }

    box.innerHTML = events.map(function (ev) {
      return (
        '<div class="timeline-item' + (ev.urgent ? " is-urgent" : "") + '">' +
          '<div class="timeline-date">' + escapeHtml(formatDateFr(ev.date)) + " · " + escapeHtml(joursLabel(daysUntil(ev.date))) + "</div>" +
          "<strong>" + escapeHtml(ev.title) + "</strong>" +
          '<p class="item-meta">' + escapeHtml(ev.detail) + "</p>" +
        "</div>"
      );
    }).join("");
  }

  function renderAll() {
    fillSubjectSelects();
    renderStats();
    renderProgress();
    renderFocus();
    renderSmart();
    renderSubjects();
    renderTasks();
    renderExams();
    renderPlanning();
  }

  function resetSubjectForm() {
    qs("matiere-id").value = "";
    qs("form-matiere").reset();
    qs("matiere-couleur").value = "#4f46e5";
    qs("titre-form-matiere").textContent = "Ajouter une matière";
    qs("btn-save-matiere").textContent = "Enregistrer la matière";
    qs("btn-cancel-matiere").hidden = true;
  }

  function resetTaskForm() {
    qs("tache-id").value = "";
    qs("form-tache").reset();
    qs("tache-date").value = todayISO();
    qs("tache-priorite").value = "moyenne";
    qs("titre-form-tache").textContent = "Ajouter une tâche";
    qs("btn-save-tache").textContent = "Ajouter la tâche";
    qs("btn-cancel-tache").hidden = true;
  }

  function resetExamForm() {
    qs("examen-id").value = "";
    qs("form-examen").reset();
    qs("examen-date").value = addDays(7);
    qs("titre-form-examen").textContent = "Ajouter un examen";
    qs("btn-save-examen").textContent = "Enregistrer l’examen";
    qs("btn-cancel-examen").hidden = true;
  }

  function showSection(id) {
    var ids = ["dashboard", "matieres", "taches", "examens", "planning"];
    ids.forEach(function (key) {
      var panel = qs("section-" + key);
      var visible = key === id;
      panel.hidden = !visible;
      panel.classList.toggle("is-visible", visible);
    });
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-section") === id);
    });
    qs("navigation").classList.remove("is-open");
    qs("btn-menu").setAttribute("aria-expanded", "false");
  }

  function bindEvents() {
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showSection(btn.getAttribute("data-section"));
      });
    });

    qs("btn-menu").addEventListener("click", function () {
      var open = qs("navigation").classList.toggle("is-open");
      qs("btn-menu").setAttribute("aria-expanded", open ? "true" : "false");
    });

    qs("form-matiere").addEventListener("submit", function (e) {
      e.preventDefault();
      var id = qs("matiere-id").value;
      var nom = qs("matiere-nom").value.trim();
      if (!nom) return;
      var payload = {
        id: id || uid(),
        nom: nom,
        enseignant: qs("matiere-enseignant").value.trim(),
        couleur: qs("matiere-couleur").value || "#4f46e5"
      };
      if (id) {
        state.subjects = state.subjects.map(function (s) { return s.id === id ? payload : s; });
        showToast("Matière mise à jour.");
      } else {
        state.subjects.push(payload);
        showToast("Matière ajoutée.");
      }
      save();
      resetSubjectForm();
      renderAll();
    });

    qs("btn-cancel-matiere").addEventListener("click", resetSubjectForm);

    qs("form-tache").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!state.subjects.length) {
        showToast("Ajoutez d’abord une matière.");
        return;
      }
      var id = qs("tache-id").value;
      var existing = state.tasks.filter(function (t) { return t.id === id; })[0];
      var payload = {
        id: id || uid(),
        titre: qs("tache-titre").value.trim(),
        matiereId: qs("tache-matiere").value,
        type: qs("tache-type").value,
        date: qs("tache-date").value,
        priorite: qs("tache-priorite").value,
        description: qs("tache-description").value.trim(),
        terminee: existing ? existing.terminee : false
      };
      if (!payload.titre || !payload.matiereId || !payload.date) return;
      if (id) {
        state.tasks = state.tasks.map(function (t) { return t.id === id ? payload : t; });
        showToast("Tâche mise à jour.");
      } else {
        state.tasks.push(payload);
        showToast("Tâche ajoutée.");
      }
      save();
      resetTaskForm();
      renderAll();
    });

    qs("btn-cancel-tache").addEventListener("click", resetTaskForm);

    qs("form-examen").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!state.subjects.length) {
        showToast("Ajoutez d’abord une matière.");
        return;
      }
      var id = qs("examen-id").value;
      var payload = {
        id: id || uid(),
        nom: qs("examen-nom").value.trim(),
        matiereId: qs("examen-matiere").value,
        date: qs("examen-date").value,
        heure: qs("examen-heure").value,
        salle: qs("examen-salle").value.trim()
      };
      if (!payload.nom || !payload.matiereId || !payload.date) return;
      if (id) {
        state.exams = state.exams.map(function (x) { return x.id === id ? payload : x; });
        showToast("Examen mis à jour.");
      } else {
        state.exams.push(payload);
        showToast("Examen ajouté.");
      }
      save();
      resetExamForm();
      renderAll();
    });

    qs("btn-cancel-examen").addEventListener("click", resetExamForm);

    ["recherche-taches", "filtre-matiere", "filtre-priorite", "filtre-statut", "tri-taches"].forEach(function (id) {
      qs(id).addEventListener("input", renderTasks);
      qs(id).addEventListener("change", renderTasks);
    });

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;

      var editS = t.getAttribute("data-edit-subject");
      var delS = t.getAttribute("data-del-subject");
      var editT = t.getAttribute("data-edit-task");
      var delT = t.getAttribute("data-del-task");
      var togT = t.getAttribute("data-toggle-task");
      var editE = t.getAttribute("data-edit-exam");
      var delE = t.getAttribute("data-del-exam");

      if (editS) {
        var s = getSubject(editS);
        if (!s) return;
        qs("matiere-id").value = s.id;
        qs("matiere-nom").value = s.nom;
        qs("matiere-enseignant").value = s.enseignant || "";
        qs("matiere-couleur").value = s.couleur;
        qs("titre-form-matiere").textContent = "Modifier la matière";
        qs("btn-save-matiere").textContent = "Enregistrer les modifications";
        qs("btn-cancel-matiere").hidden = false;
        showSection("matieres");
      }

      if (delS) {
        openConfirm("Supprimer cette matière ? Les tâches et examens liés resteront visibles mais sans matière reconnue.", function () {
          state.subjects = state.subjects.filter(function (x) { return x.id !== delS; });
          save();
          resetSubjectForm();
          renderAll();
          showToast("Matière supprimée.");
        });
      }

      if (editT) {
        var task = state.tasks.filter(function (x) { return x.id === editT; })[0];
        if (!task) return;
        qs("tache-id").value = task.id;
        qs("tache-titre").value = task.titre;
        qs("tache-matiere").value = task.matiereId;
        qs("tache-type").value = task.type;
        qs("tache-date").value = task.date;
        qs("tache-priorite").value = task.priorite;
        qs("tache-description").value = task.description || "";
        qs("titre-form-tache").textContent = "Modifier la tâche";
        qs("btn-save-tache").textContent = "Enregistrer les modifications";
        qs("btn-cancel-tache").hidden = false;
        showSection("taches");
      }

      if (delT) {
        openConfirm("Voulez-vous vraiment supprimer cette tâche ?", function () {
          state.tasks = state.tasks.filter(function (x) { return x.id !== delT; });
          save();
          renderAll();
          showToast("Tâche supprimée.");
        });
      }

      if (togT) {
        state.tasks = state.tasks.map(function (x) {
          if (x.id === togT) {
            x.terminee = !x.terminee;
          }
          return x;
        });
        save();
        renderAll();
      }

      if (editE) {
        var exam = state.exams.filter(function (x) { return x.id === editE; })[0];
        if (!exam) return;
        qs("examen-id").value = exam.id;
        qs("examen-nom").value = exam.nom;
        qs("examen-matiere").value = exam.matiereId;
        qs("examen-date").value = exam.date;
        qs("examen-heure").value = exam.heure || "";
        qs("examen-salle").value = exam.salle || "";
        qs("titre-form-examen").textContent = "Modifier l’examen";
        qs("btn-save-examen").textContent = "Enregistrer les modifications";
        qs("btn-cancel-examen").hidden = false;
        showSection("examens");
      }

      if (delE) {
        openConfirm("Voulez-vous vraiment supprimer cet examen ?", function () {
          state.exams = state.exams.filter(function (x) { return x.id !== delE; });
          save();
          renderAll();
          showToast("Examen supprimé.");
        });
      }
    });

    qs("modal-ok").addEventListener("click", function () {
      var cb = confirmCallback;
      closeConfirm();
      if (cb) cb();
    });
    qs("modal-cancel").addEventListener("click", closeConfirm);
    qs("overlay").addEventListener("click", function (e) {
      if (e.target === qs("overlay")) closeConfirm();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !qs("overlay").hidden) closeConfirm();
    });

    qs("btn-reset").addEventListener("click", function () {
      openConfirm("Réinitialiser les données et recharger l’exemple de démonstration ?", function () {
        seedDemo();
        resetSubjectForm();
        resetTaskForm();
        resetExamForm();
        renderAll();
        showSection("dashboard");
        showToast("Données de démonstration restaurées.");
      });
    });
  }

  function init() {
    var hasData = load();
    if (!localStorage.getItem(INIT_KEY) && !hasData) {
      seedDemo();
    } else if (!hasData) {
      seedDemo();
    }
    bindEvents();
    resetSubjectForm();
    resetTaskForm();
    resetExamForm();
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
