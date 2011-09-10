import os, os.path

localeDir = os.path.join(os.getcwd(), 'chrome', 'locale')
locales = os.listdir(localeDir)

for l in locales:
  rows = {}
  fp = open(os.path.join(localeDir, l, 'amo.properties'), 'r')
  for line in fp:
    parts = line.split('=', 2)
    rows[parts[0]] = parts[1].strip()
  fp.close()
  print '<em:localized locale="' + l + '">'
  print '<Description>'
  print '<em:locale>' + l + '</em:locale>'
  print '<em:name>' + rows['name'] + '</em:name>'
  print '<em:description>' + rows['description3'] + '</em:description>'
  print '<em:creator>Geoff Lankow</em:creator>'
  print '<em:translator>' + rows['devcomments1'] + '</em:translator>'
  print '</Description>'
  print '</em:localized>'
