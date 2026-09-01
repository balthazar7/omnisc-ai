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
    cancel: "Annuler",
    save: "Enregistrer",
    back: "Retour aux projets",
    signOut: "Se déconnecter",
  },

  org: {
    /** Nom donné à l'organisation créée à la première connexion. Renommable. */
    defaultName: "Mon organisation",
  },

  auth: {
    title: "Se connecter",
    lead: "Entrez votre adresse. Vous recevrez un lien de connexion, sans mot de passe à retenir.",
    emailLabel: "Adresse e-mail",
    emailPlaceholder: "vous@votre-societe.fr",
    submit: "Recevoir le lien",
    /*
      Message volontairement identique dans tous les cas : adresse inconnue,
      adresse hors liste d'autorisation, ou envoi réussi. Il ne doit jamais être
      possible de savoir si un compte existe.
    */
    sent: "Si cette adresse est valide, un lien de connexion vient d'être envoyé. Il expire dans une heure.",
    invalidEmail: "Cette adresse ne semble pas valide.",
    failed: "L'envoi a échoué. Réessayez dans un instant.",
    linkExpired: "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
  },

  projects: {
    title: "Projets",
    empty: "Aucun projet pour l'instant.",
    emptyLead: "Créez un projet, mettez son adresse en copie de vos échanges, et Omnisc suit le reste.",
    create: "Créer un projet",
    archivedBadge: "Archivé",
    activeBadge: "Actif",
    quotaLabel: "Projets actifs",
    quotaReached:
      "Votre plan est à sa limite de projets actifs. Archivez un projet pour libérer une place.",
    addressColumn: "Adresse du projet",
    nameColumn: "Projet",
    statusColumn: "Statut",

    new: {
      title: "Nouveau projet",
      lead: "Le nom sert à vous repérer. L'adresse en est dérivée, puis elle ne change plus.",
      nameLabel: "Nom du projet",
      namePlaceholder: "Levée de fonds Startup",
      previewLabel: "Adresse générée",
      previewNote:
        "Aperçu indicatif : les quatre derniers caractères sont tirés au hasard à la création.",
      submit: "Créer le projet",
      nameRequired: "Donnez un nom au projet.",
      quotaError:
        "Votre plan est à sa limite de projets actifs. Archivez un projet pour libérer une place.",
      addressError:
        "L'adresse n'a pas pu être générée. Réessayez, ou changez légèrement le nom du projet.",
    },

    detail: {
      addressLabel: "Adresse du projet",
      addressHelp:
        "Mettez cette adresse en copie de vos e-mails de projet. Rien d'autre à faire : ni compte à créer pour vos interlocuteurs, ni outil à changer.",
      copy: "Copier l'adresse",
      copied: "Adresse copiée",
      settings: "Réglages",
    },

    settings: {
      title: "Réglages du projet",
      nameLabel: "Nom du projet",
      rename: "Renommer",
      renamed: "Nom modifié.",
      /* Dit à l'écran, parce que c'est contre-intuitif et que s'en apercevoir trop tard coûte des messages. */
      renameNote:
        "Renommer ne change pas l'adresse du projet : elle figure en copie de fils déjà en cours.",
      addressLabel: "Adresse du projet",
      addressFixed: "Définitive, elle ne peut pas être modifiée.",
      archiveTitle: "Archiver le projet",
      archiveNote:
        "Un projet archivé continue de recevoir et de conserver les e-mails envoyés à son adresse. Il n'est simplement plus traité, et il libère une place dans votre plan.",
      archive: "Archiver",
      unarchive: "Réactiver",
      archived: "Projet archivé.",
      unarchived: "Projet réactivé.",
      unarchiveQuotaError:
        "Votre plan est à sa limite de projets actifs. Archivez un autre projet pour réactiver celui-ci.",
    },
  },
} as const;

export type Dictionary = typeof fr;
