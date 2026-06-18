with open('js/app.js', 'r') as f:
    code = f.read()

OLD = "    API.ping().catch(() => {});\n\n    setLoadingProgress(55, 'Carregando sessão...');\n\n    if (typeof MobyaAuth !== 'undefined') {\n      try {\n        await Promise.race([\n          MobyaAuth.init(),\n          new Promise(r => setTimeout(r, 5000))\n        ]);\n      } catch (e) { console.warn('Auth init falhou', e); }\n    }\n\n    setLoadingProgress(80, 'Montando interface...');\n\n    bindNavigation();\n\n    if (typeof Monetization !== 'undefined' && typeof Monetization.init === 'function') {\n      try { Monetization.init(); } catch (e) { console.warn('Monetization init falhou', e); }\n    }\n\n    const initial = (location.hash || '#home').replace('#', '') || 'home';\n    setLoadingProgress(100, 'Pronto.');\n\n    navigate(initial);\n\n    setInterval(() => API.ping().catch(() => {}), 60000);\n\n    setTimeout(hideLoadingScreen, 300);"

NEW = "    bindNavigation();\n\n    if (typeof Monetization !== 'undefined' && typeof Monetization.init === 'function') {\n      try { Monetization.init(); } catch (e) { console.warn('Monetization init falhou', e); }\n    }\n\n    const initial = (location.hash || '#home').replace('#', '') || 'home';\n    setLoadingProgress(100, 'Pronto.');\n    navigate(initial);\n    setTimeout(hideLoadingScreen, 300);\n\n    setTimeout(async () => {\n      try { await Promise.race([API.ping(), new Promise(r => setTimeout(r, 8000))]); } catch {}\n      if (typeof MobyaAuth !== 'undefined') {\n        try { await Promise.race([MobyaAuth.init(), new Promise(r => setTimeout(r, 8000))]); } catch {}\n      }\n      setInterval(() => API.ping().catch(() => {}), 60000);\n    }, 200);"

if OLD in code:
    with open('js/app.js', 'w') as f:
        f.write(code.replace(OLD, NEW))
    print('OK')
else:
    print('NAO ENCONTRADO')
