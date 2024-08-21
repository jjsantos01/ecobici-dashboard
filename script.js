const prod = 0; //window.location.hostname === "localhost" ? 0 : 1;
const proxyUrl = prod === 1 ? '' : 'http://localhost:5000/get_rides';
let data = [];
let ecobiciHeatmapViajes;
let ecobiciHeatmapTiempo;
let resultsDataTable;
let userId;
let ecobici;
let monthlyRidesChart;
let HourlyRidesChart;
let heatmapDiasMomentoChart;
let top10StationsChart;
let top10StationsHeatmap;
let top10StationsDurationHeatmap;

const colorPalette = {
  "STC": 'rgba(254, 80, 0, 0.8)', // FE5000
  "ECOBICI": 'rgba(0, 154, 68, 0.8)', // #009A44
  "METROBÚS": 'rgba(200, 16, 46, 0.8)', // #C8102E
  "RUTA": 'rgba(155, 38, 182, 0.8)', //#9B26B6
  "CABLEBUS": 'rgba(78, 195, 224, 0.8)', // #4EC3E0
  "CETRAM": "rgba(240, 78, 152, 0.8)", // #F04E98
  "STE": 'rgba(0, 87, 184, 0.8)', // #0057B8
  "RTP": 'rgba(120, 190, 32, 0.8)', // #78BE20
  "Mañana": 'rgba(75, 192, 192, 0.8)',
  "Tarde": 'rgba(153, 102, 255, 0.8)',
  "Noche": 'rgba(22, 192, 67, 0.8)',
  // Añade más organismos y colores según sea necesario
};

document.addEventListener('DOMContentLoaded', async () => {
  // const form = document.getElementById('searchForm');
  window.mapInstances = {};

  // form.addEventListener('submit', async (e) => {
  //     e.preventDefault();
  //     ecobici = [];
  //     processSubmit();
  // });

  // const infoIcon = document.getElementById('yearInfo');
  // const popup = document.getElementById('infoPopup');

  // infoIcon.addEventListener('click', function(e) {
  //     e.preventDefault();
  //     popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
  //     popup.style.top = (e.clientY + 10) + 'px';
  //     popup.style.left = (e.clientX + 10) + 'px';
  // });

  // document.addEventListener('click', function(e) {
  //     if (e.target !== infoIcon && !popup.contains(e.target)) {
  //         popup.style.display = 'none';
  //     }
  // });

  if (!prod) {
    data = await fetchTestData();
    updateSectionContents(data);
    }
  });

document.getElementById('downloadCSV').addEventListener('click', function() {
  const csv = convertDataToCSV(ecobici);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `datos-ecibici-${userId}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  function convertDataToCSV(data) {
    const header = Object.keys(data[0]).join(","); // Encabezado con los nombres de las claves
    const rows = data.map(row => Object.values(row).join(",")); // Filas con los valores
    return [header, ...rows].join("\n"); // Une encabezado y filas con saltos de línea
  }
});

document.getElementById('downloadJSON').addEventListener('click', function() {
    const json = JSON.stringify(ecobici, null, 2); // El parámetro '2' es para formatear el JSON con indentación
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `datos-ecobici-${userId}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

async function processSubmit() {
  data = [];
  showLoadingMessage();
  const nRides = document.getElementById('nRides').value.toString();
  userId = document.getElementById('userId').value.trim();
  if (userId.toLowerCase() === 'test') {
      data = await fetchTestData();
      updateSectionContents(data);
  } else if (userId) {
      try {
          data = await fetchData(userId, nRides);
          updateSectionContents(data);
      } catch (error) {
          console.error('Error:', error);
          alert('Hubo un error al obtener los datos. Por favor, intente de nuevo.');
          document.getElementById('loadingMessage').innerHTML = '';
      }
  }
}

function displayResults(data) {
    const resultsTable = document.getElementById('resultsTable');

    if (data && data.length > 0) {
        // Get all unique keys from all objects in the data array
        const allKeys = [...new Set(data.flatMap(Object.keys))];

        // If DataTable doesn't exist or has different columns, initialize/reinitialize it
        if (!$.fn.DataTable.isDataTable('#resultsTable') ||
            resultsDataTable.columns().header().length !== allKeys.length) {

            if (resultsDataTable) {
                resultsDataTable.destroy();
            }

            resultsDataTable = $('#resultsTable').DataTable({
                columns: allKeys.map(key => ({
                    title: key,
                    data: key,
                    defaultContent: '' // Use this for missing data
                })),
                scrollX: true
            });
        }

        // Clear existing data and add new data
        resultsDataTable.clear().rows.add(data).draw();

        resultsTable.style.display = 'table';
    } else {
        // If there's no data, destroy the DataTable if it exists
        if ($.fn.DataTable.isDataTable('#resultsTable')) {
            resultsDataTable.destroy();
            resultsDataTable = null;
        }

        resultsTable.style.display = 'none';
        alert('No se encontraron resultados para el número de serie proporcionado.');
    }
}

function updateSectionContents(data) {
  let numero = 0;
  const weekday = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  ecobici = data.map(d => {
    numero += 1;
    const fechaInicio = new Date(parseInt(d.startTimeMs))
    return {
      numero: numero,
      estacionInicio: d.startAddressStr,
      estacionFin: d.endAddressStr,
      fechaInicio: fechaInicio,
      fechaFin: new Date(parseInt(d.endTimeMs)),
      diaSemana: weekday[fechaInicio.getDay()],
      horaInicio: fechaInicio.getHours(),
      momentoDia: getMomentoDia(fechaInicio.getHours()),
      duracion: Math.round(d.duration / (1000 * 60)), // Duración en minutos
      distancia: d.distance.value,
    }
  }
  )
  const inicioViaje = ecobici.map(d => {
    return {
      numero: d.numero,
      estacion: d.estacionInicio,
      fecha: d.fechaInicio,
    }
  });
  const finViaje = ecobici.map(d => {
    return {
      numero: d.numero,
      estacion: d.estacionFin,
      fecha: d.fechaFin,
    }
  }
  );
  showAllSections();
  getEcobiciStats(inicioViaje, finViaje);
  createMonthlyTrips(ecobici);
  createHourlyRidesChart(ecobici);
  createHeatmapMomentoDia(ecobici);
  createTop10StationsChart(inicioViaje, finViaje);
  createTop10StationsHeatmap(ecobici, inicioViaje, finViaje);
  createTop10StationsDurationHeatmap(ecobici, inicioViaje, finViaje);
  // createEcobiciHeatmap(inicioViaje, finViaje, tipo='viajes', minViajes=min_viajes);
  // createEcobiciHeatmap(inicioViaje, finViaje, tipo='tiempo', minViajes=min_viajes);
  createEcobiciMap(inicioViaje, finViaje);
  displayResults(ecobici);
  svg = d3.select('#visualization');
  if (svg) {
    svg.selectAll('*').remove();
  }
}

function showLoadingMessage() {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => { section.style.display = 'none'; });
  const loadingMessage = document.getElementById('loadingMessage');
  loadingMessage.innerText = 'Espere mientras se cargan sus datos, tardará varios segundos...';
  loadingMessage.style.display = 'block';
}

function showAllSections() {
    // Cuando los datos estén listos, mostrar las secciones
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
      if (section.id === 'statsContainer') {
        section.style.display = 'flex';
      }
      else {
        section.style.display = 'block';
      }
     });
    // Eliminar el mensaje de carga
    document.getElementById('loadingMessage').innerHTML = '';
}

async function fetchData(userId, nRides) {
  const data = {
    nRides: nRides,
    userId: userId
  };

  try {
      const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const output = await response.json();
      return output;
  } catch (error) {
      console.error('Error:', error);
      document.getElementById('result').innerHTML = 'Error al obtener los datos. Verifica tu User ID y conexión.';
  }
}

async function fetchTestData() {
  const response = await fetch('data/test-data.json'); //await fetch('http://localhost:8000/datos/viajes_ecobici.json');
  const data = await response.json();
  return data;
}

function getEcobiciODViajes(inicioViaje, finViaje) {
  // Crear un mapa de viajes
  const viajesMap = new Map();
  inicioViaje.forEach(inicio => {
      const fin = finViaje.find(f => f.numero === inicio.numero);
      if (fin) {
          const key = `${inicio.estacion}+${fin.estacion}`;
          viajesMap.set(key, (viajesMap.get(key) || 0) + 1);
      }
  });

  // Convertir el mapa a un array de objetos para ApexCharts
  return Array.from(viajesMap, ([key, value]) => {
      const [inicio, fin] = key.split('+');
      return { x: inicio, y: fin, value: value };
  });
}

function getEcobiciODMeanTime(inicioViaje, finViaje) {
  // Crear un mapa para almacenar tiempos de viaje entre estaciones
  const viajesMap = new Map();

  inicioViaje.forEach(inicio => {
      const fin = finViaje.find(f => f.numero === inicio.numero);
      if (fin) {
          const key = `${inicio.estacion}+${fin.estacion}`;
          const fechaInicio = inicio.fecha;
          const fechaFin = fin.fecha;

          // Calcular el tiempo de viaje en minutos
          const tiempoViaje = (fechaFin - fechaInicio) / (1000 * 60);

          // Si el tiempo de viaje es válido, almacenarlo
          if (tiempoViaje > 0) {
              if (!viajesMap.has(key)) {
                  viajesMap.set(key, { sumTiempo: 0, count: 0 });
              }
              const entry = viajesMap.get(key);
              entry.sumTiempo += tiempoViaje;
              entry.count += 1;
          }
      }
  });

  // Convertir el mapa a un array de objetos para ApexCharts
  return Array.from(viajesMap, ([key, { sumTiempo, count }]) => {
      const [inicio, fin] = key.split('+');
      const promedioTiempo = sumTiempo / count;
      return { x: inicio, y: fin, value: Math.round(promedioTiempo) };
  });
}

function getMomentoDia(hora) {
  if (hora <= 11) {
      return "Mañana";
  } else if (hora <= 18) {
      return "Tarde";
  } else {
      return "Noche";
  }
}

function getEcobiciStats(inicioViaje, finViaje) {
  let totalViajes = 0;
  let tiempoTotal = 0;
  const estacionesUnicas = new Set();

  inicioViaje.forEach(inicio => {
    const fin = finViaje.find(f => f.numero === inicio.numero);
    if (fin) {
      const fechaInicio = inicio.fecha;
      const fechaFin = fin.fecha;

      const tiempoViaje = (fechaFin - fechaInicio) / (1000 * 60); // Tiempo en minutos

      if (tiempoViaje > 0) {
        totalViajes++;
        tiempoTotal += tiempoViaje;
        estacionesUnicas.add(inicio.estacion);
        estacionesUnicas.add(fin.estacion);
      }
    }
  });

  const distanciaTotal = ecobici.reduce((acc, viaje) => acc + viaje.distancia, 0);
  const tiempoPromedio = totalViajes > 0 ? tiempoTotal / totalViajes : 0;
  const distanciaPromedio = totalViajes > 0 ? distanciaTotal / totalViajes : 0;
  document.getElementById('totalViajesEcobici').textContent = totalViajes.toLocaleString();
  document.getElementById('totalTiempoEcobici').textContent = `${tiempoTotal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} minutos`;
  document.getElementById('tiempoPromedioEcobici').textContent = `${tiempoPromedio.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} minutos`;
  document.getElementById('estacionesVisitadas').textContent = estacionesUnicas.size;
  document.getElementById('distanciaTotal').textContent = `${distanciaTotal.toFixed(0)} kms`;
  document.getElementById('distanciaPromedio').textContent = `${distanciaPromedio.toFixed(0)} kms`;

  document.querySelectorAll(`#ecobiciStatsContainer p`).forEach((p) => {
    p.parentElement.style.setProperty('background-color', colorPalette['ECOBICI'].replace(/[\d\.]+\)$/g, '0.5)'));
  }
  );
}

function generateRandomColor() {
    return `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.8)`;
}

function getColorForOrganismo(organismo) {
    return colorPalette[organismo] || generateRandomColor();
}

function createHeatmap(viajes, selectedOrganismo = 'Todos') {
  const heatmapElement = document.getElementById('heatmapChart');
  if (!heatmapElement) {
      console.error('Elemento con ID "heatmapChart" no encontrado');
      return;
  }

  const filteredViajes = selectedOrganismo === 'Todos' ? viajes : viajes.filter(viaje => viaje.organismo === selectedOrganismo);

  const diasSemana = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const momentosDia = ['Mañana', 'Tarde', 'Noche'];

  const data = diasSemana.map(dia => {
      return momentosDia.map(momento => {
          const count = filteredViajes.filter(viaje => viaje.dayOfWeek === dia && viaje.momento_dia === momento).length;
          return {
              x: momento,
              y: count,
              dia: dia,
          };
      });
  }).flat();

  const options = {
      series: diasSemana.map(dia => ({
          name: dia,
          data: data.filter(item => item.dia === dia)
      })),
      chart: {
          height: 350,
          type: 'heatmap',
      },
      dataLabels: {
          enabled: true,
      },
      colors: ["#008FFB"],
      title: {
          text: 'Viajes por día de la semana y momento'
      },
      xaxis: {
          categories: momentosDia
      },
      yaxis: {
          categories: diasSemana.reverse()
      }
  };

  if (heatmapChart) {
      heatmapChart.destroy();
  }

  heatmapChart = new ApexCharts(document.getElementById("heatmapChart"), options);
  heatmapChart.render();
}

function initializeMap(sistema, lat, lng, zoom) {
  const mapId = `map${sistema}`;

  if (window.mapInstances[mapId]) {
    window.mapInstances[mapId].remove();
  }

  const map = L.map(mapId).setView([lat, lng], zoom);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

  window.mapInstances[mapId] = map;
}

function hoverPopup(layer) {
  layer.on('mouseover', function (e) {
    this.openPopup();
  });
  layer.on('mouseout', function (e) {
    this.closePopup();
  });
}

function createEcobiciHeatmap(inicioViaje, finViaje, tipo='viajes', minViajes=2) {
  const viajes = getEcobiciODViajes(inicioViaje, finViaje);
  const processedData = tipo=='viajes' ? viajes : getEcobiciODMeanTime(inicioViaje, finViaje);
  const estaciones = [...new Set([...processedData.map(d => d.x), ...processedData.map(d => d.y)])];
  const viajeCounts = {};
  viajes.forEach(({ x: origen, y: destino, value }) => {
      viajeCounts[origen] = (viajeCounts[origen] || 0) + value;
      viajeCounts[destino] = (viajeCounts[destino] || 0) + value;
  });
  const estacionesPopulares = estaciones.filter(estacion => viajeCounts[estacion] >= minViajes);

  function convertDataToHeatmapSeries(data) {
    // Crear un objeto para mapear las estaciones y sus valores
    const seriesMap = {};

    // Inicializar las series para cada estación de origen filtrada
    estacionesPopulares.forEach(origen => {
        seriesMap[origen] = {
            name: origen, // El nombre de la serie será la estación de origen
            data: []
        };
    });
    // Añadir datos al mapa
    data.forEach(({ x: origen, y: destino, value }) => {
        if (seriesMap[origen] && estacionesPopulares.includes(destino)) {
            seriesMap[origen].data.push({ x: destino, y: value });
        }
    });

    // Ordenar los datos de cada serie de acuerdo al orden de `estacionesFiltradas`
    estacionesPopulares.forEach(origen => {
        seriesMap[origen].data.sort((a, b) => estacionesPopulares.indexOf(a.x) - estacionesPopulares.indexOf(b.x));
    });

    // Rellenar los destinos faltantes con valor 0 y ordenar de nuevo
    estacionesPopulares.forEach(origen => {
        estacionesPopulares.forEach(destino => {
            if (!seriesMap[origen].data.some(item => item.x === destino)) {
                seriesMap[origen].data.push({ x: destino, y: 0 });
            }
        });
        seriesMap[origen].data.sort((a, b) => estacionesPopulares.indexOf(a.x) - estacionesPopulares.indexOf(b.x));
    });

    // Convertir el objeto en un array de series
    return Object.values(seriesMap);
  }

  const seriesMap = convertDataToHeatmapSeries(processedData, estaciones);
  const ordenEstaciones = seriesMap.map(s => s.name);
  const prefixTitle = tipo === 'viajes' ? 'Número de viajes' : 'Tiempo promedio de viaje';

  // Configurar y crear el gráfico
  const options = {
      series: seriesMap,
      chart: {
          type: 'heatmap',
          height: 350
      },
      dataLabels: {
          enabled: true,
      },
      colors: ["#008000"],
      title: {
          text: `${prefixTitle} entre tus rutas más comunes de Ecobici`,
      },
      xaxis: {
          categories: ordenEstaciones,
          labels: {
              rotate: -45,
              rotateAlways: true,
              maxHeight: 60
          }
      },
      yaxis: {
          categories: ordenEstaciones
      }
  };

  if (tipo === 'viajes'){
    if (ecobiciHeatmapViajes){
      ecobiciHeatmapViajes.destroy();
    }
    ecobiciHeatmapViajes = new ApexCharts(document.querySelector(`#ecobici-${tipo}`), options);
    ecobiciHeatmapViajes.render();
    } else {
      if (ecobiciHeatmapTiempo){
        ecobiciHeatmapTiempo.destroy();
      }
      ecobiciHeatmapTiempo = new ApexCharts(document.querySelector(`#ecobici-${tipo}`), options);
      ecobiciHeatmapTiempo.render();
    }
}

function createEcobiciMap(inicioViaje, finViaje) {
  initializeMap('Ecobici', 19.389688, -99.167158, 13);

  const viajesEstacionesInicio = inicioViaje.reduce((acc, viaje) => {
    const idEstacion = viaje.estacion.slice(0, 6);
    acc[idEstacion] = (acc[idEstacion] || 0) + 1;
    return acc;
  }, {});

  const viajesEstacionesFin = finViaje.reduce((acc, viaje) => {
    const idEstacion = viaje.estacion.slice(0, 6);
    acc[idEstacion] = (acc[idEstacion] || 0) + 1;
    return acc;
  } , {});

  // Cargar y mostrar las estaciones del metro
  fetch('maps/cicloestaciones_ecobici.geojson')
  .then(response => response.json())
  .then(ecobici => {
  L.geoJSON(ecobici, {
    pointToLayer: function (feature, latlng) {
    var nombreEstacion = `CE-${feature.properties.num_cicloe} ${feature.properties.calle_prin}-${feature.properties.calle_secu}`;
    var idEstacion = nombreEstacion.slice(0, 6);
    var numViajes = (viajesEstacionesInicio[idEstacion] || 0) + (viajesEstacionesFin[idEstacion] || 0);
    if (numViajes > 0) {
    return L.circleMarker(latlng, {
      radius: Math.min(numViajes, 20),  // Ajustar el factor de escala según sea necesario
      color: "green",
      fillColor: "green",
      fillOpacity: 0.8
    }).bindPopup("<strong>" + nombreEstacion +
       "</strong><br>Total viajes: " + numViajes +
       "<br> inicio de viaje: " + (viajesEstacionesInicio[idEstacion] || 0) +
        "<br> fin de viaje: " + (viajesEstacionesFin[idEstacion] || 0)
      );
  }
  },
  onEachFeature: function(feature, layer) {
    if (feature.properties && feature.properties.estacion) {
      hoverPopup(layer);
    }
  }
  }).addTo(window.mapInstances['mapEcobici']);
  })
  .catch(error => console.error('Error al cargar las estaciones de ecobici', error));
}

function parseDateTime(dateTimeString) {
    const [datePart, timePart] = dateTimeString.split(' ');
    const [day, month, year] = datePart.split('-');
    const [hour, minute, second] = timePart.split(':');
    return new Date(year, month - 1, day, hour, minute, second);
}

function openAboutModal() {
  document.getElementById('aboutModal').style.display = "block";
}

function closeAboutModal() {
  document.getElementById('aboutModal').style.display = "none";
}
// Cerrar el modal cuando se hace clic fuera de él
window.onclick = function(event) {
  if (event.target == document.getElementById('aboutModal')) {
    closeAboutModal();
  }
}

function groupRidesByMonth(rides) {
  const monthlyRides = {};

  rides.forEach(ride => {
    const monthYear = ride.fechaInicio.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (monthlyRides[monthYear]) {
      monthlyRides[monthYear]++;
    } else {
      monthlyRides[monthYear] = 1;
    }
  });

  return monthlyRides;
}

function createMonthlyTrips(ecobici) {
  const monthlyRidesData = groupRidesByMonth(ecobici);
  const months = {"ene": "01", "feb": "02", "mar": "03", "abr": "04", "may": "05", "jun": "06", "jul": "07", "ago": "08", "sep": "09", "oct": "10", "nov": "11", "dic": "12"};

  const chartData = Object.entries(monthlyRidesData).map(([month, count]) => ({
    month: new Date(`${month.slice(4)}-${months[month.slice(0, 3).toLowerCase()]}`),
    y: count,
    x: month,
  }));

  chartData.sort((a, b) => (a.month - b.month));
  const options = {
    series: [{
      name: 'Número de viajes',
      data: chartData
    }],
    chart: {
      type: 'line',
      height: 350,
      zoom: {
        enabled: false
      }
    },
    dataLabels: {
      enabled: true,
    },
    colors: [colorPalette['ECOBICI']],
    stroke: {
      curve: 'straight'
    },
    title: {
      text: 'Viajes mensuales de Ecobici',
      align: 'left'
    },
    grid: {
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5
      },
    },
    xaxis: {
      type: 'category',
    },
    yaxis: {
      title: {
        text: 'Número de viajes'
      }
    }
  };

  if (monthlyRidesChart){
    monthlyRidesChart.destroy();
  }
  monthlyRidesChart = new ApexCharts(document.getElementById("monthlyRidesChart"), options);
  monthlyRidesChart.render();
  };

function countRidesByHour(ecobici) {
  const hourlyRides = Array(24).fill(0);

  ecobici.forEach(ride => {
    hourlyRides[ride.horaInicio]++;
  });

  return hourlyRides;
}

function createHourlyRidesChart(ecobici) {
  const hourlyRidesData = countRidesByHour(ecobici);

  const options = {
    series: [{
      name: 'Número de viajes',
      data: hourlyRidesData
    }],
    chart: {
      type: 'bar',
      height: 350
    },
    colors: [colorPalette['ECOBICI']],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded'
      },
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0') + ':00'),
      title: {
        text: 'Hora del día'
      }
    },
    yaxis: {
      title: {
        text: 'Número de viajes'
      }
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + " viajes"
        }
      }
    },
    title: {
      text: 'Viajes por hora del día',
      align: 'center'
    }
  };

  if (HourlyRidesChart){
    HourlyRidesChart.destroy();
  }
  HourlyRidesChart = new ApexCharts(document.getElementById("HourlyRidesChart"), options);
  HourlyRidesChart.render();
}

function countRidesByDayAndMoment(ecobici) {
  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const momentsOfDay = ['Mañana', 'Tarde', 'Noche'];
  const ridesCounts = daysOfWeek.map(() => new Array(momentsOfDay.length).fill(0));

  ecobici.forEach(ride => {
    const dayIndex = daysOfWeek.indexOf(ride.diaSemana);
    const momentIndex = momentsOfDay.indexOf(ride.momentoDia);
    if (dayIndex !== -1 && momentIndex !== -1) {
      ridesCounts[dayIndex][momentIndex]++;
    }
  });

  return { ridesCounts, daysOfWeek, momentsOfDay };
}

function createHeatmapMomentoDia(ecobici) {
  const { ridesCounts, daysOfWeek, momentsOfDay } = countRidesByDayAndMoment(ecobici);

  const options = {
    series: ridesCounts.map((data, index) => ({
      name: daysOfWeek[index],
      data: data
    })),
    chart: {
      height: 350,
      type: 'heatmap',
    },
    dataLabels: {
      enabled: true,
    },
    colors: ["#008000"],
    title: {
      text: 'Viajes por día de la semana y momento del día'
    },
    xaxis: {
      categories: momentsOfDay,
      title: {
        text: 'Momento del día'
      }
    },
    yaxis: {
      categories: daysOfWeek,
      title: {
        text: 'Día de la semana'
      },
      reversed: true
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
      }
    },
    tooltip: {
      y: {
        formatter: function(val) {
          return val + " viajes"
        }
      }
    }
  };

  if (heatmapDiasMomentoChart){
    heatmapDiasMomentoChart.destroy();
  }
  heatmapDiasMomentoChart = new ApexCharts(document.querySelector("#heatmapDiasMomentoChart"), options);
  heatmapDiasMomentoChart.render();
}

function countRidesByStation(rides) {
  return rides.reduce((acc, ride) => {
    acc[ride.estacion] = (acc[ride.estacion] || 0) + 1;
    return acc;
  }, {});
}

function getTop10Stations(startRides, endRides) {
  const startCounts = countRidesByStation(startRides);
  const endCounts = countRidesByStation(endRides);

  const allStations = new Set([...Object.keys(startCounts), ...Object.keys(endCounts)]);

  const stationTotals = Array.from(allStations).map(station => ({
    station,
    total: (startCounts[station] || 0) + (endCounts[station] || 0)
  }));

  return stationTotals
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(item => item.station);
}

function createTop10StationsChart(inicioViaje, finViaje) {
  const top10Stations = getTop10Stations(inicioViaje, finViaje);
  const startCounts = countRidesByStation(inicioViaje);
  const endCounts = countRidesByStation(finViaje);

  const seriesData = [
    {
      name: 'Viajes que inician',
      data: top10Stations.map(station => startCounts[station] || 0)
    },
    {
      name: 'Viajes que terminan',
      data: top10Stations.map(station => endCounts[station] || 0)
    }
  ];

  const options = {
    series: seriesData,
    chart: {
      type: 'bar',
      height: 350,
      stacked: true
    },
    plotOptions: {
      bar: {
        horizontal: true
      }
    },
    stroke: {
      width: 1,
      colors: ['#fff']
    },
    title: {
      text: 'Top 10 estaciones más usadas'
    },
    xaxis: {
      categories: top10Stations,
      title: {
        text: 'Número de viajes'
      }
    },
    yaxis: {
      title: {
        text: 'Estaciones'
      }
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + " viajes"
        }
      }
    },
    fill: {
      opacity: 1
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      offsetX: 40
    },
    colors: ['#008FFB', colorPalette['ECOBICI']]
  };

  if (top10StationsChart){
    top10StationsChart.destroy();
  }

  top10StationsChart = new ApexCharts(document.querySelector("#top10StationsChart"), options);
  top10StationsChart.render();
}

function countTripsBetwenStations(ecobici, top10Stations) {
  const tripCounts = top10Stations.map(() => new Array(10).fill(0));

  ecobici.forEach(trip => {
    const startIndex = top10Stations.indexOf(trip.estacionInicio);
    const endIndex = top10Stations.indexOf(trip.estacionFin);
    if (startIndex !== -1 && endIndex !== -1) {
      tripCounts[startIndex][endIndex]++;
    }
  });

  return tripCounts;
}

function createTop10StationsHeatmap(ecobici, inicioViaje, finViaje) {
  const top10Stations = getTop10Stations(inicioViaje, finViaje);
  const tripCounts = countTripsBetwenStations(ecobici, top10Stations);

  const options = {
    series: tripCounts.map((row, index) => ({
      name: top10Stations[index],
      data: row
    })),
    chart: {
      height: 450,
      type: 'heatmap',
    },
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#555555'],
      }
    },
    colors: ["#008000"],
    title: {
      text: 'Viajes entre las 10 estaciones más usadas'
    },
    xaxis: {
      categories: top10Stations,
      title: {
        text: 'Estación de destino'
      }
    },
    yaxis: {
      categories: top10Stations,
      title: {
        text: 'Estación de origen'
      },
      reversed: true
    },
    tooltip: {
      y: {
        formatter: function(val) {
          return val + " viajes"
        }
      }
    }
  };

  if (top10StationsHeatmap){
    top10StationsHeatmap.destroy();
  }

  top10StationsHeatmap = new ApexCharts(document.querySelector("#top10StationsHeatmap"), options);
  top10StationsHeatmap.render();
}

function calculateAverageDurationAndCount(ecobici, top10Stations) {
  const tripData = top10Stations.map(() => top10Stations.map(() => ({ totalDuration: 0, count: 0 })));

  ecobici.forEach(trip => {
    const startIndex = top10Stations.indexOf(trip.estacionInicio);
    const endIndex = top10Stations.indexOf(trip.estacionFin);
    if (startIndex !== -1 && endIndex !== -1) {
      tripData[startIndex][endIndex].totalDuration += trip.duracion;
      tripData[startIndex][endIndex].count++;
    }
  });

  return tripData.map(row =>
    row.map(cell => ({
      avgDuration: cell.count > 0 ? cell.totalDuration / cell.count : 0,
      count: cell.count
    }))
  );
}

function createTop10StationsDurationHeatmap(ecobici, inicioViaje, finViaje) {
  const top10Stations = getTop10Stations(inicioViaje, finViaje);
  const tripData = calculateAverageDurationAndCount(ecobici, top10Stations);

  const options = {
    series: tripData.map((row, index) => ({
      name: top10Stations[index],
      data: row.map(cell => Math.round(cell.avgDuration))
    })),
    chart: {
      height: 450,
      type: 'heatmap',
    },
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#555555'],
      }
    },
    colors: ["#008000"],
    title: {
      text: 'Duración promedio (minutos) de viajes entre las 10 estaciones más usadas'
    },
    xaxis: {
      categories: top10Stations,
      title: {
        text: 'Estación de destino'
      }
    },
    yaxis: {
      categories: top10Stations,
      title: {
        text: 'Estación de origen'
      },
      reversed: true
    },
    tooltip: {
      custom: function({ seriesIndex, dataPointIndex, w }) {
        const data = tripData[seriesIndex][dataPointIndex];
        const avgDuration = data.avgDuration.toFixed(1);
        const count = data.count;
        return `<div class="arrow_box">
          <span><b>Estación origen</b>: ${top10Stations[seriesIndex]}</span><br>
          <span><b>Estación destino</b>: ${top10Stations[dataPointIndex]}</span><br>
          <span><b>Duración promedio:</b> ${avgDuration} minutos</span><br>
          <span><b>Número de viajes:</b> ${count}</span>
        </div>`;
      }
    }
  };

  top10StationsDurationHeatmap = new ApexCharts(document.querySelector("#top10StationsDurationHeatmap"), options);
  top10StationsDurationHeatmap.render();
}
