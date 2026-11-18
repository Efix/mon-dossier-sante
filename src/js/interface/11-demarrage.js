  if (appVersion) $('app-version').textContent = (online ? 'Version en ligne ' : 'Application hors ligne · version ') + appVersion
  updateLink($('update-link'))
  for (const [key, label] of Object.entries(Coffre.types)) $('doc-kind').add(option(key, label))
  for (const [key, label] of Object.entries(Coffre.labs)) $('doc-lab').add(option(key, label))
  for (const [, label] of Lab.markers) $('marker-names').append(option(label, label))
  if (!window.isSecureContext || !window.crypto?.subtle) {
    notice('access-message', 'Ouvre ce fichier dans un navigateur de bureau récent, par exemple Edge ou Chrome, pour utiliser le chiffrement.', 'warn')
    $('choose-vault').disabled = true
    $('new-vault').disabled = true
  }
