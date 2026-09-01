/**
 * Dictionnaire des chaînes d'interface — français.
 *
 * Aucune chaîne en dur dans un composant, même avec une seule langue au
 * catalogue : c'est la seule couture d'internationalisation qui demande de la
 * discipline, et la seule coûteuse à rattraper.
 *
 * Aucune bibliothèque d'i18n, aucun sélecteur de langue en V1. Les dates et les
 * nombres passent par `lib/i18n/format.ts`, jamais par un formatage à la main.
 *
 * Ton : DESIGN.md §9 — phrases courtes, pas de superlatif, pas d'emoji. Les
 * libellés nomment un fait.
 */
export const fr = {
  app: {
    name: "Omnisc",
    tagline: "La mémoire des projets inter-entreprises.",
    description:
      "Omnisc lit les e-mails d'un projet et tient à jour qui s'est engagé à quoi, quelles décisions ont été prises et ce qui est resté sans réponse.",
  },

  home: {
    title: "Ce qui a été dit, et ce qui manque.",
    lead: "Un projet implique plusieurs sociétés. L'information de coordination vit dans les e-mails, éparpillée entre les boîtes de quinze personnes.",
    points: [
      {
        title: "Rien à saisir",
        body: "Une adresse en copie de vos échanges suffit. Personne ne change d'outil.",
      },
      {
        title: "Les engagements suivis",
        body: "Chaque promesse, chaque échéance, chaque décision, avec la version qui fait foi.",
      },
      {
        title: "Les absences calculées",
        body: "Une demande restée sans réponse ne se cherche pas. Elle se déduit.",
      },
    ],
    cta: "Créer un projet",
    ctaNote: "L'ouverture des comptes arrive prochainement.",
  },

  design: {
    title: "Système de design",
    lead: "Page de vérification des jetons et des composants. Toutes les valeurs viennent de design/tokens.ts, qui transcrit DESIGN.md.",
    sections: {
      colors: "Couleurs",
      colorRoles: "Rôles",
      typography: "Typographie",
      spacing: "Espacement",
      radius: "Rayons",
      elevation: "Élévation",
      motion: "Mouvement",
      components: "Composants",
    },
    colorRoles: [
      { token: "--accent", usage: "Boutons primaires, liens, sources citées, valeurs mises en avant" },
      { token: "--alert", usage: "Retards, jours de silence, purge, échéances dépassées" },
      { token: "--ok", usage: "Connecteurs actifs, engagements tenus, projets actifs" },
      { token: "--text2 / --text3", usage: "Tout le reste" },
    ],
    components: {
      button: "Boutons",
      buttonPrimary: "Enregistrer",
      buttonSecondary: "Annuler",
      buttonTertiary: "Voir le fil",
      buttonDanger: "Purger",
      buttonSizes: "Tailles",
      pills: "Groupe de pilules",
      pillsItems: ["Engagements", "Demandes", "Décisions"],
      nav: "Navigation latérale",
      navItems: [
        { label: "Vue projet", count: 0 },
        { label: "Engagements", count: 18 },
        { label: "Sans réponse", count: 3 },
        { label: "Quarantaine", count: 1 },
      ],
      badge: "Badges",
      badgeOk: "Tenu",
      badgeAlert: "Retard 3 j",
      badgeAccent: "Actif",
      badgeNeutral: "Remplacé",
      source: "Citation de source",
      sourceNote: "Toujours suffixée par une flèche. Format : objet du fil, puis date en JJ/MM.",
      field: "Champ de saisie",
      fieldLabel: "Adresse du projet",
      fieldPlaceholder: "nom-du-projet",
      fieldHint: "Dix caractères aléatoires au minimum.",
      table: "Tableau",
      tableHeaders: {
        statement: "Énoncé",
        actor: "Acteur",
        due: "Échéance",
        status: "Statut",
        source: "Source",
      },
      kpi: "Carte KPI",
      kpiLabel: "Engagements tenus",
      kpiSuffix: "sur 18",
      kpiAlertLabel: "Sans réponse",
      kpiAlertSuffix: "demandes",
      avatar: "Avatars",
      avatarAgent: "Agent",
      bubble: "Bulle de conversation",
      bubbleQuestion: "Où en est-on sur la production ?",
      bubbleAnswer:
        "Livraison de 2 000 unités annoncée au 3 avril. Cette date remplace un engagement précédent au 12 mars, décalé faute de BAT.",
      bubbleRefusal:
        "Les éléments disponibles ne permettent pas de conclure. Aucun message ne mentionne cette échéance.",
      panel: "Panneau rangeable",
      panelTitle: "Fils du projet",
      panelBody: "Le contenu replié passe à opacity zéro et sort du flux de lecture.",
      gauge: "Jauge circulaire",
      gaugeLabel: "Couverture du corpus",
    },
    /*
      Jeu d'essai repris de l'exemple travaillé de CLAUDE.md. Les dates ne sont
      pas ici : elles sont fournies par la page sous forme de `Date` et passent
      par `Intl`, jamais par une chaîne écrite à la main.
    */
    sampleFacts: [
      {
        statement: "Livrer 2 000 unités",
        actor: "Marc Deleuze",
        org: "Fabrik Industries",
        status: "Actif",
        sourceSubject: "Planning production",
      },
      {
        statement: "Confirmer que le BAT sera prêt",
        actor: "Julie Roux",
        org: "Studio Nord",
        status: "Sans réponse",
        sourceSubject: "BAT packaging",
      },
      {
        statement: "Livrer 2 000 unités",
        actor: "Marc Deleuze",
        org: "Fabrik Industries",
        status: "Remplacé",
        sourceSubject: "Planning production",
      },
    ],
    removalNotice: "Cette page est supprimée au lot 7.",
  },

  common: {
    collapse: "Replier",
    expand: "Déplier",
  },
} as const;

export type Dictionary = typeof fr;
