// Page d'accueil du site (publication/index.html) : ouvrir en ligne, télécharger, vérifier l'empreinte,
// et répondre au lien « Rechercher une mise à jour » de l'application (?depuis=1.2.3).
// Comme l'application, elle ne se connecte à rien : son script ne fait que lire l'adresse de la page.
import crypto from 'node:crypto'

const echapper = texte => String(texte).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c])
const taille = octets => new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 1}).format(octets / (1024 * 1024)) + ' Mo'

// Exécuté dans le navigateur. Venue de l'application, la page indique si une version plus récente existe.
function scriptAccueil() {
  'use strict'
  const $ = id => document.getElementById(id)
  const derniere = $('donnees').dataset.derniere
  const depuis = new URLSearchParams(location.search).get('depuis') ?? ''
  if (!/^\d+\.\d+\.\d+$/.test(depuis)) return
  const nombres = version => version.split('.').map(Number)
  const [x, y] = [nombres(depuis), nombres(derniere)]
  const ecart = x.findIndex((n, i) => n !== y[i])
  const ancienne = ecart >= 0 && x[ecart] < y[ecart]
  $('depuis').hidden = false
  if (ancienne) {
    $('depuis').className = 'encart nouvelle'
    $('depuis-texte').textContent = `Vous utilisez la version ${depuis}. La version ${derniere} est disponible : ` +
      'téléchargez-la ci-dessous, puis ouvrez votre coffre .sante avec. Le coffre ne change pas.'
  } else {
    $('depuis-texte').textContent = `Vous utilisez la version ${depuis} : c’est la dernière publiée, aucune mise à jour à faire.`
  }
}

export const scriptPage = '(' + scriptAccueil.toString().replace(/\r\n/g, '\n') + ')()\n'
export const empreinteScript = 'sha256-' + crypto.createHash('sha256').update(scriptPage, 'utf8').digest('base64')

// versions : [{tag, empreinte, date, fichier, octets}], de la plus ancienne à la plus récente.
export function pageAccueil({versions, depot}) {
  const derniere = versions.at(-1)
  const registre = `https://github.com/${depot}/blob/main/versions-publiees.txt`
  const lignes = [...versions].reverse().map(({tag, empreinte, date, fichier}) =>
    `        <tr><td>${echapper(tag)}${tag === derniere.tag ? ' <small>(actuelle)</small>' : ''}</td><td>${echapper(date)}</td>` +
    `<td><a href="${echapper(tag)}/">Ouvrir</a> · <a href="${echapper(tag)}/${echapper(fichier)}" download>Télécharger</a></td>` +
    `<td><code>${echapper(empreinte)}</code></td></tr>`)
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src '${empreinteScript}'; connect-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Mon dossier santé</title>
  <style>
    body { font: 16px/1.55 system-ui, sans-serif; max-width: 62rem; margin: 2rem auto; padding: 0 1rem; color: #1f2933; }
    h1 { margin-bottom: .2rem; }
    h2 { margin-top: 2.2rem; }
    section, .encart { border: 1px solid #d9e2ec; border-radius: .6rem; padding: 1rem 1.2rem; margin: 1rem 0; }
    section > h2:first-child { margin-top: 0; }
    .encart { background: #f0f4f8; }
    .encart.nouvelle { background: #fff8e1; border-color: #f0c36d; }
    .encart p { margin: 0; }
    .boutons { display: flex; flex-wrap: wrap; gap: .7rem; margin: 1rem 0; }
    .bouton { display: inline-block; padding: .65rem 1.1rem; background: #0b5d4b; color: #fff; border-radius: .45rem; text-decoration: none; font-weight: 600; }
    .bouton.principal { font-size: 1.05rem; }
    .bouton.second { background: #fff; color: #0b5d4b; border: 1px solid #0b5d4b; }
    code { font-size: .82rem; word-break: break-all; }
    pre { background: #f0f4f8; padding: .6rem .8rem; border-radius: .4rem; overflow-x: auto; font-size: .85rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #d9e2ec; vertical-align: top; }
    .muted { color: #52606d; }
  </style>
</head>
<body>
  <h1>Mon dossier santé</h1>
  <p class="muted">Vos bilans et documents de santé, dans un coffre chiffré que vous gardez sur votre appareil. L’application fonctionne entièrement dans votre navigateur (Edge ou Chrome, sur ordinateur) : elle n’envoie rien et ne se connecte à aucun serveur.</p>

  <div id="depuis" class="encart" hidden><p id="depuis-texte"></p></div>

  <section>
    <h2>Version ${echapper(derniere.tag.slice(1))} <small class="muted">du ${echapper(derniere.date)}</small></h2>
    <div class="boutons">
      <a class="bouton principal" href="${echapper(derniere.tag)}/${echapper(derniere.fichier)}" download>Télécharger l’application (${taille(derniere.octets)})</a>
      <a class="bouton second" href="${echapper(derniere.tag)}/">Essayer en ligne</a>
    </div>
    <p><strong>Téléchargée</strong>, c’est un seul fichier HTML, à ouvrir depuis votre disque, même sans connexion. Une fois vérifié, il ne change plus : c’est la façon la plus sûre de l’utiliser. Pour la mettre à jour, utilisez « Rechercher une mise à jour » dans l’application (page Coffre).</p>
    <p><strong>En ligne</strong>, rien à installer, mais chaque visite fait confiance au site qui envoie la page.</p>
    <p><strong>Important</strong> : sans votre phrase secrète, votre coffre ne peut pas être ouvert, par personne. Conservez-la, et gardez des copies du coffre. Les valeurs lues dans les PDF sont des propositions à vérifier avec l’original ; l’application range vos documents, elle ne donne pas d’avis médical.</p>
  </section>

  <section>
    <h2>Vérifier le fichier téléchargé</h2>
    <p>Son empreinte SHA-256 doit être exactement celle-ci, également notée dans le <a href="${echapper(registre)}">registre du dépôt public</a> où chaque version est inscrite une fois pour toutes :</p>
    <p><code>${echapper(derniere.empreinte)}</code></p>
    <p>Pour la calculer sur votre appareil, dans le dossier de téléchargement :</p>
    <p>Windows (PowerShell)</p>
    <pre>Get-FileHash .\\${echapper(derniere.fichier)}</pre>
    <p>macOS ou Linux</p>
    <pre>shasum -a 256 ${echapper(derniere.fichier)}</pre>
  </section>

  <h2>Toutes les versions</h2>
  <p class="muted">Le contenu d’une version ne change jamais. Liste des empreintes : <a href="SHA256SUMS">SHA256SUMS</a>.</p>
  <table>
    <thead><tr><th>Version</th><th>Date</th><th></th><th>Empreinte SHA-256</th></tr></thead>
    <tbody>
${lignes.join('\n')}
    </tbody>
  </table>
  <p class="muted">Code source et publication : <a href="https://github.com/${echapper(depot)}">github.com/${echapper(depot)}</a>. Ce site est construit par GitHub à partir des versions du dépôt.</p>

  <template id="donnees" data-derniere="${echapper(derniere.tag.slice(1))}"></template>
  <script>${scriptPage}</script>
</body>
</html>
`
}
