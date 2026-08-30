# Agent CDP — Design System (thème Beige)

Spec de référence extraite de la maquette `Agent CDP v4 Fond uni.dc.html`, thème **Beige**.
Fonds unis (pas de dégradés, pas d'images), hiérarchie par valeur, échelle et élévation.

---

## 1. Fondations

### 1.1 Police

```
Manrope — Google Fonts, poids 300 / 400 / 500 / 600 / 700 / 800
https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap
```

```css
body {
  font-family: "Manrope", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums; /* obligatoire : tous les chiffres sont alignés */
}
```

Aucune seconde famille. Pas d'italique. Pas de police monospace.

### 1.2 Jetons de couleur (CSS custom properties)

```css
:root, [data-theme="beige"] {
  /* surfaces */
  --bg:          #f0eee7;   /* fond de page, uni */
  --glass:       #faf9f5;   /* surface primaire : cartes, panneaux */
  --glass2:      #f5f3ed;   /* surface secondaire : en-têtes de carte, lignes survolées */
  --glass3:      #fffefb;   /* surface tertiaire : champs, puces, boutons secondaires */

  /* traits */
  --stroke:      #e4e0d5;             /* bordure de carte */
  --hair:        rgba(38,32,22,.08);  /* séparateur interne */
  --hair2:       rgba(38,32,22,.15);  /* bordure de contrôle */

  /* texte */
  --text:        #1c1a15;   /* titres, valeurs */
  --text2:       #5f5a4f;   /* corps de texte */
  --text3:       #918c7f;   /* métadonnées, libellés */

  /* accent (terracotta) */
  --accent:      #9a5b33;
  --accent-soft: rgba(154,91,51,.09);
  --accent-line: rgba(154,91,51,.26);

  /* alerte / retard / silence */
  --alert:       #b0503f;
  --alert-soft:  rgba(176,80,63,.08);
  --alert-line:  rgba(176,80,63,.26);

  /* validé / connecté */
  --ok:          #4d7a52;
  --ok-soft:     rgba(77,122,82,.1);

  /* élévation */
  --shade:    0 1px 2px rgba(38,32,22,.05), 0 10px 26px -20px rgba(38,32,22,.2);
  --shade-lg: 0 1px 2px rgba(38,32,22,.06), 0 24px 56px -34px rgba(38,32,22,.28);
  --inset:    inset 0 1px 0 rgba(255,255,255,.7);
}
```

Règles d'usage couleur :

| Rôle | Jeton | À utiliser pour |
|---|---|---|
| Accent | `--accent` | boutons primaires, liens, sources citées, valeurs mises en avant |
| Alerte | `--alert` | retards, jours de silence, purge, échéances dépassées |
| Validé | `--ok` | connecteurs actifs, engagements tenus, projets actifs |
| Neutre | `--text2` / `--text3` | tout le reste |

Interdits : dégradés de fond, ombres colorées autres que celles du bouton primaire, plus de deux surfaces empilées, nouvelles teintes hors jetons.

### 1.3 Autres thèmes livrés

Même structure de jetons, seules les valeurs changent : `grey`, `beige`, `blue`, `green`, `dark`.
Se référer au bloc `<style>` de `Agent CDP v4 Fond uni.dc.html` pour les cinq jeux complets.
En mode `dark`, `--inset` passe à `inset 0 1px 0 rgba(255,255,255,.05)` et les ombres deviennent noires.

---

## 2. Typographie

Échelle réelle utilisée. Le `letter-spacing` se resserre quand la taille augmente.

| Usage | Taille | Poids | Letter-spacing | Line-height | Couleur |
|---|---|---|---|---|---|
| Titre landing | 62px | 700 | -.04em | 1.03 | `--text` |
| Section landing | 34px | 700 | -.03em | 1.1 | `--text` |
| Titre de carte majeure | 29px | 700 | -.032em | 1.18 | `--text` |
| Titre d'écran (h1) | 26px | 700 | -.03em | 1.2 | `--text` |
| Titre de panneau | 24px | 700 | -.025em | 1.25 | `--text` |
| Chiffre KPI | 28px | 700 | -.035em | 1 | valeur sémantique |
| Chiffre héros | 66px | 800 | -.05em | .9 | `--alert` |
| Sous-titre | 19px | 700 | -.02em | 1.3 | `--text` |
| Intro / lead | 17px | 400 | 0 | 1.6 | `--text2` |
| Corps large | 15.5px | 500 | 0 | 1.55 | `--text` |
| Libellé de ligne | 14.5px | 500-600 | -.01em | 1.4 | `--text` |
| Corps | 13.5px | 400 | 0 | 1.65 | `--text2` |
| Corps dense / cellule | 13px | 400-500 | 0 | 1.45 | `--text` / `--text2` |
| Métadonnée | 12.5px | 400-600 | 0 | 1.5 | `--text2` |
| Libellé de champ | 12px | 600 | 0 | 1.4 | `--text2` |
| Légende | 11.5px | 400 | 0 | 1.55 | `--text3` |
| Micro / badge | 11px | 400-700 | 0 | 1.3 | contextuel |
| Badge minuscule | 10.5px | 700 | 0 | 1 | contextuel |

Règles : `text-wrap: pretty` sur tout paragraphe long et tout titre de plus de 4 mots. Jamais de `text-transform: uppercase`. Jamais d'italique.

---

## 3. Espacement

Pas de grille stricte de 4px : l'échelle est resserrée et impaire par endroits. Valeurs autorisées :

```
1  2  3  4  5  6  7  8  9  10  11  12  13  14  16  18  20  22  24  26  28  30  32  44  60  64  70  80  90
```

Usages canoniques :

| Contexte | Valeur |
|---|---|
| Gap dans un groupe de puces | 3-4px |
| Gap icône ↔ texte | 8-11px |
| Padding de contrôle (bouton md) | 10px 17px |
| Padding de cellule de tableau | 14px 20px |
| Padding de carte | 18-24px |
| Padding de carte majeure | 26px 28px |
| Gap entre cartes | 14-16px |
| Gap de grille d'écran | 18px |
| Padding d'écran app | 20px 22px 60px |
| Marge entre sections landing | 60-90px |
| Séparateur en grille | `gap:1px; background:var(--hair)` |

---

## 4. Rayons

| Élément | Rayon |
|---|---|
| Pilule, bouton, badge, chip | `999px` |
| Carte majeure / hero | 30-34px |
| Carte standard | 26-28px |
| Sous-carte, encart | 20-24px |
| Ligne de liste, champ | 14-18px |
| Puce, jeton d'icône | 7-13px |
| Surlignage `<mark>` | 5px |
| Avatar | `50%` |

Rien n'a un rayon nul. Le rayon décroît avec l'imbrication : 30 → 24 → 16.

---

## 5. Élévation & matière

```css
/* carte standard */
background: var(--glass);
border: 1px solid var(--stroke);
box-shadow: var(--shade), var(--inset);
backdrop-filter: blur(30px) saturate(175%);
-webkit-backdrop-filter: blur(30px) saturate(175%);

/* carte majeure / modale / hero */
box-shadow: var(--shade-lg), var(--inset);
backdrop-filter: blur(36px) saturate(180%);
```

Le liseré `--inset` est systématique sur toute surface `--glass`. Le flou va de 24px (petits éléments) à 40px (hero). Saturation 170-180%.

Une carte mise en avant remplace `--stroke` par `--accent-line` (ou `--alert-line` si le sujet est un manque).

---

## 6. Composants

### 6.1 Boutons

```css
/* primaire */
background: var(--accent); color: #fff; border: none; border-radius: 999px;
font-weight: 600; cursor: pointer;
box-shadow: 0 12px 28px -14px var(--accent);      /* md */
transition: transform .3s cubic-bezier(.32,.72,0,1);
/* :hover */ transform: translateY(-2px);          /* lg : translateY(-2px) scale(1.02) */

/* secondaire */
background: var(--glass); border: 1px solid var(--stroke); color: var(--text);
backdrop-filter: blur(24px); box-shadow: var(--shade); font-weight: 500;
/* :hover */ transform: translateY(-2px);

/* tertiaire (dans une carte) */
background: var(--glass3); border: 1px solid var(--hair2); font-weight: 500-600;
/* :hover */ border-color: var(--accent-line); color: var(--accent);

/* danger */
background: var(--alert-soft); color: var(--alert); border: 1px solid var(--alert-line);
/* :hover */ background: var(--alert); color: #fff;
```

Tailles :

| Taille | Padding | Font-size | Ombre primaire |
|---|---|---|---|
| lg | 14px 26px | 14.5px | `0 14px 34px -14px var(--accent)` |
| md | 10px 17px | 12.5px | `0 12px 28px -14px var(--accent)` |
| sm | 8px 15px | 12px | aucune |
| xs | 5px 11px | 11.5px | aucune |
| bloc | 11-13px (100% largeur) | 13.5px | `0 12px 30px -14px var(--accent)` |

### 6.2 Groupe de pilules (onglets, sélecteur de thème, navigation)

```html
<div style="display:flex; gap:4px; padding:4px; border-radius:999px;
            background:var(--glass2); border:1px solid var(--hair)">
  <!-- actif -->
  <button style="background:var(--glass3); color:var(--text); font-weight:600;
                 box-shadow:0 1px 2px rgba(22,21,32,.10); border:none;
                 border-radius:999px; padding:7px 14px; font-size:12.5px;
                 transition:all .35s cubic-bezier(.32,.72,0,1)">Engagements</button>
  <!-- inactif : background:transparent; color:var(--text2); font-weight:500; box-shadow:none -->
</div>
```

### 6.3 Élément de navigation latérale

`display:flex; justify-content:space-between; padding:9px 11px; border-radius:13px; font-size:13px`
Actif : `background:var(--glass3)`, `font-weight:600`, `box-shadow:0 1px 2px rgba(22,21,32,.10)`.
Compteur à droite en 11px `--text3`.

### 6.4 Badge / statut

`font-size:11px; border-radius:999px; padding:4px 11px`
Couleurs par sens : `--ok` sur `--ok-soft`, `--alert` sur `--alert-soft`, `--accent` sur `--accent-soft`, `--text3` sur `--glass3`.

### 6.5 Citation de source (élément signature du produit)

```html
<span style="font-size:11px; color:var(--accent); background:var(--accent-soft);
             border:1px solid var(--accent-line); padding:5px 11px; border-radius:999px;
             white-space:nowrap">RE: CCTP réserves · 07/08 ↗</span>
```
Toujours suffixé par `↗`. Version lien : `:hover { background:var(--accent); color:#fff }`.
Format du libellé : `Objet du fil · JJ/MM`.

### 6.6 Champ de saisie

```css
background: var(--glass3); border: 1px solid var(--hair2); border-radius: 14px;
padding: 11px 14px; font-size: 13.5px; outline: none;
transition: border-color .3s, box-shadow .3s;
/* :focus */ border-color: var(--accent-line); box-shadow: 0 0 0 4px var(--accent-soft);
```
Libellé au-dessus : 12px / 600 / `--text2`, gap 7px. Aide en dessous : 11.5px / `--text3`.

### 6.7 Tableau / liste

En-tête : `padding:14px 20px; background:var(--glass2); font-size:11.5px; color:var(--text3)`.
Ligne : `display:grid` + colonnes en `fr`, `gap:14-16px`, `padding:12-14px 20px`, `border-top:1px solid var(--hair)`, `transition:background .3s`, `:hover { background:var(--glass2) }`.
Cellule principale : 13-14px, sous-texte 11.5-12px `--text3` à 4px en dessous.
Colonne de droite : citation de source, jamais tronquée (`white-space:nowrap`).

### 6.8 Carte KPI

```html
<div style="border-radius:22px; background:var(--glass); border:1px solid var(--stroke);
            box-shadow:var(--shade), var(--inset); padding:18px">
  <div style="font-size:12px; color:var(--text3)">Engagements tenus</div>
  <div style="display:flex; align-items:baseline; gap:7px; margin-top:9px">
    <span style="font-size:28px; font-weight:700; letter-spacing:-.035em; color:var(--ok)">14</span>
    <span style="font-size:12px; color:var(--text3)">sur 18</span>
  </div>
  <div style="height:4px; border-radius:99px; background:var(--hair); margin-top:13px; overflow:hidden">
    <div style="width:78%; height:100%; border-radius:99px; background:var(--ok);
                animation:grow 1.1s cubic-bezier(.16,1,.3,1) both"></div>
  </div>
</div>
```
Survol : `transform:translateY(-3px)` en `.4s cubic-bezier(.32,.72,0,1)`.

### 6.9 Avatar

`width:28-30px; height:28-30px; border-radius:50%; border:1px solid var(--hair2); background:var(--glass3); font-size:10.5-11px; font-weight:700; color:var(--text2)`.
Avatar agent : `background:var(--accent); color:#fff`.

### 6.10 Bulle de conversation

Question : `background:var(--glass2); border:1px solid var(--hair); padding:12px 16px; border-radius:18px 18px 18px 6px`.
Réponse : `background:var(--glass3); border:1px solid var(--accent-line); padding:14px 18px; border-radius:18px 18px 6px 18px`.
Refus de réponse : encart `background:var(--alert-soft); border:1px solid var(--alert-line); border-radius:18px`.
Corps : 14px / 1.7 / `white-space:pre-line`, largeur max 660px.

### 6.11 Panneau rangeable

Colonne pilotée par `grid-template-columns` (`224px` ↔ `54px` à gauche, `300px` ↔ `46px` à droite), `transition:grid-template-columns .5s cubic-bezier(.32,.72,0,1)`.
Bouton : rond 26px, `border-radius:50%`, `background:var(--glass3)`, `border:1px solid var(--hair2)`, `box-shadow:var(--shade)`, glyphe `‹` / `›` 12px.
Le contenu replié passe à `opacity:0`, `pointer-events:none`, `aria-hidden="true"` ; conteneur en `overflow:hidden`.

### 6.12 Jauge circulaire

```html
<svg viewBox="0 0 100 100" style="width:78px; height:78px; transform:rotate(-90deg)">
  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--hair2)" stroke-width="9"></circle>
  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent)" stroke-width="9"
          stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset="106"
          style="animation:dash 1.4s cubic-bezier(.16,1,.3,1) both"></circle>
</svg>
```
`stroke-dasharray` = 264 (r=42). `stroke-dashoffset` = 264 × (1 − ratio).

---

## 7. Mouvement

```css
@keyframes rise  { from { opacity:0; transform:translateY(14px) scale(.985); } to { opacity:1; transform:none; } }
@keyframes fade  { from { opacity:0; } to { opacity:1; } }
@keyframes halo  { 0%,100% { opacity:.55; transform:scale(1); } 50% { opacity:.95; transform:scale(1.9); } }
@keyframes sweep { from { transform:translateX(-110%); } to { transform:translateX(320%); } }
@keyframes grow  { from { width:0; } }
@keyframes dash  { from { stroke-dashoffset:320; } }

@media (prefers-reduced-motion: reduce) { * { animation-duration:.01ms !important; } }
```

| Rôle | Déclaration |
|---|---|
| Entrée de carte majeure | `rise .75s cubic-bezier(.16,1,.3,1) both` |
| Entrée de page (landing) | `rise .9s cubic-bezier(.16,1,.3,1) both`, cascade `+.12s` |
| Changement d'onglet | `fade .5s ease both` |
| Barre de progression | `grow 1.1s cubic-bezier(.16,1,.3,1) both` |
| Jauge SVG | `dash 1.4s cubic-bezier(.16,1,.3,1) both` |
| Point d'alerte pulsé | `halo 2.6s ease-in-out infinite` |
| Reflet sur bloc mis en avant | `sweep 4.5s cubic-bezier(.4,0,.2,1) infinite` |

Deux courbes seulement :
- **entrée** `cubic-bezier(.16,1,.3,1)` — .75s à 1.4s
- **interaction** `cubic-bezier(.32,.72,0,1)` — .3s à .5s (survol, pilules, colonnes)
- couleur / bordure / ombre : `ease`, .3s

Survols autorisés : `translateY(-2px)` (bouton), `translateY(-3px)` (KPI), `translateY(-4px)` (carte feature), `translateX(4px)` (ligne de liste), `scale(1.02-1.04)` (petit bouton), changement de `background` sur ligne de tableau.

---

## 8. Layout

```
Barre de navigation flottante : sticky top:0, padding 16px 20px 0, pilule centrée
                                (background:var(--glass), border 1px --stroke, --shade + --inset)
Écran app  : max-width 1560px, grid "224px 1fr", gap 18px, padding 20px 22px 60px
Panneaux collants : top:88px
Écran avec panneau droit : grid "minmax(0,1fr) 300px", gap 16px
Landing    : max-width 1200px, padding 64px 28px 90px
Onboarding : max-width 1060px, grid "1fr 1fr", gap 20px
Grille de cartes : repeat(3,1fr) ou repeat(4,1fr), gap 14-16px
Tarifs     : repeat(5,1fr), gap 14px
Zone de chat : min-height 74vh
```

Colonnes de tableau typiques : `1.9fr 1fr auto auto` (état du projet), `1.5fr 1.1fr 1fr .9fr auto` (membres), `1.7fr .85fr .85fr .85fr` (comparatif).

---

## 9. Contenu & ton

- Français, phrases courtes, pas de superlatif, pas d'emoji.
- Les libellés nomment un fait : « Ce qui manque », « Demandes sans réponse », « jours de silence ».
- Toute donnée affichée porte sa source (`Objet · JJ/MM ↗`) ; sans source, l'élément n'est pas affiché.
- Les durées de silence et retards s'écrivent `9 j`, `Retard 3 j` ; les dates `JJ/MM`.
- Les montants : `79 € HT / mois`, chiffres en `tabular-nums`.

---

## 10. Notes d'implémentation

- Styles **inline** dans la maquette (contrainte de l'outil de design). En production, mapper ces jetons sur Tailwind (`theme.extend`) ou des CSS variables + classes utilitaires ; ne pas réinventer de valeurs.
- Tous les jetons sont thémables : le sélecteur `[data-theme="…"]` porte les variables, aucun composant ne code une couleur en dur sauf `#fff` sur fond `--accent` / `--alert`.
- `backdrop-filter` a besoin du préfixe `-webkit-`.
- Les chiffres alignés (`tabular-nums`) sont indispensables dans les tableaux et les KPI.
