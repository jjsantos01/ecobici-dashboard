# Visualizador de viajes de Ecobici

Este proyecto es una página web para visualizar los datos de los viajes realizados en el sistema público de bicicletas de la Ciudad de México, [Ecobici](ecobici.cdmx.gob.mx).

Este proyecto es de naturaleza personal, no tiene ninguna afiliacion gubernamenteal, ni del servicio de Ecobici y tampoco tiene fines de lucro.

Puede ser consultado en: [https://gh.jjsantoso.com/ecobici-dashboard/](https://gh.jjsantoso.com/ecobici-dashboard/).

Casi la totalidad del código de este proyecto fue generada usando modelos de inteligencia artificial como [Claude](https://claude.ai/chat), [chatGPT4](https://chat.openai.com/) y [Copilot](https://github.com/features/copilot).

## ¿Cómo funciona?

El sitio web toma la información directamente desde la página oficial de usuarios de Ecobici y la presenta de manera visual e interactiva. Todo el procesamiento de datos se realiza localmente en el navegador del usuario y no se recopila ni almacena ninguna información personal.

## Código
Los archivos principales de este proyecto son:
- ```index.html```: Página principal del sitio web.
- ```style.css```: Hoja de estilos para la página web.
- ```script.js```: Código JavaScript para la interacción de la página web.
- ```gcs-proxy```: En este folder hay un archivo `main.py` que es un servidor proxy para obtener los datos de la API de Ecobici, necesario para evitar problemas de CORS. Este servidor se ejecuta en Google Cloud Functions.

Puede ejecutarse localmente con el siguiente comando:
```bash
make run
```

## Sitio renderizado
![](/images/ecobici-dashboard.png)
