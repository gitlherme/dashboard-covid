const selectItemCountry = document.querySelector('#selectCountries');
const selectItemData = document.querySelector('#selectData');
const applyButton = document.querySelector('#applyFilters');
const dateStart = document.querySelector('#date-start');
const dateEnd = document.querySelector('#date-end');
const baseUrl = 'https://api.covid19api.com';
var lineChart;

window.onload = function() {
  init();
}

function init() {
  if(document.querySelector('.dashboard-main-content')) {
    getGlobalStatus();
  } else {
    let today = new Date();
    let yesterday = new Date(today.getTime());
    yesterday.setDate(today.getDate() - 1);
    let beforeYesterday = new Date(today.getTime());
    beforeYesterday.setDate(today.getDate() - 2);
    dateStart.value = beforeYesterday.toISOString().substr(0, 10);
    dateEnd.value = yesterday.toISOString().substr(0, 10);


    getCountries();
    getCountryStatus(selectItemCountry.value, selectItemData.value);
    applyButton.addEventListener('click', (e) => {
      lineChart.destroy();
      e.preventDefault();
      getCountryStatus(selectItemCountry.value, selectItemData.value);
    })
  }
}

async function getSummary() {
  let { data } = await axios.get(`${baseUrl}/summary`);
  return data;
}

async function getCountries() {
  let { data } = await axios.get(`${baseUrl}/countries`);

  const sortedCountries = data.sort((a, b) => a.Country > b.Country ? 1 : -1);

  sortedCountries.forEach((country) => {
    if(country.Country != 'Brazil') {
      let option = document.createElement('option');
      option.value = country.Slug;
      option.text = country.Country;
      selectItemCountry.add(option, selectItemCountry.options[selectItemCountry.options.length+1])
    }
  })
}

async function getGlobalStatus() {
  const data = await getSummary();
  drawGlobalDashboard(data);
}

async function getCountryStatus(country, whichData) {
  const dateToSearch = new Date(dateStart.value);
  dateToSearch.setDate(dateToSearch.getDate() - 1);
  const formattedDateToSearch = dateToSearch.toISOString().substr(0, 10)
  let { data } = await axios.get(`${baseUrl}/country/${country}?from=${formattedDateToSearch}T00:00:00Z&to=${dateEnd.value}T00:00:00Z`);
  const dataArray = [];
  const dataDaily = [];
  if(whichData == 'confirmed') {
    data.forEach((item) => dataArray.push({date: item.Date, data: item.Confirmed}));
    dataArray.forEach((item) => {
      if (dataDaily.length >= 1) {
        dataDaily.push({ date: item.date, data: item.data - dataArray[dataArray.indexOf(item) - 1].data });
      } else {
        dataDaily.push({ date: item.date, data: item.data });
      }
    })
    dataDaily.shift();  
  } else if (whichData == 'deaths') {
    data.forEach((item) => dataArray.push({date: item.Date, data: item.Deaths}));
    dataArray.forEach((item) => {
      if (dataDaily.length >= 1) {
        dataDaily.push({ date: item.date, data: item.data - dataArray[dataArray.indexOf(item) - 1].data });
      } else {
        dataDaily.push({ date: item.date, data: item.data });
      }
    })
    dataDaily.shift();  
  } else {
    data.forEach((item) => dataArray.push({date: item.Date, data: item.Recovered}));
    dataArray.forEach((item) => {
      if (dataDaily.length >= 1) {
        dataDaily.push({ date: item.date, data: item.data - dataArray[dataArray.indexOf(item) - 1].data });
      } else {
        dataDaily.push({ date: item.date, data: item.data });
      }
    })
    dataDaily.shift();  
  }

  drawCountriesDashboard(dataDaily, whichData);
}

async function getMostDeathsByCountries() {
  const data = await getSummary();
  const deathsByCountry = [];
  const countries = data.Countries;
  countries.forEach((country) => deathsByCountry.push({name: country.Country, deaths: country.TotalDeaths}));
  const sortedCountries = deathsByCountry.sort((countryA, countryB) => countryB.deaths - countryA.deaths);

  // Usando Lodash para retornar apenas os 10 primeiros
  return _.slice(sortedCountries, 0, 10);
}

async function drawGlobalDashboard(data) {
  //KPIs
  const totalConfirmedSpan = document.querySelector('.total-confirmed-value');
  const totalDeathsSpan = document.querySelector('.total-deaths-value');
  const totalRecoveredSpan = document.querySelector('.total-recovered-value');
  
  totalConfirmedSpan.innerHTML = data.Global.TotalConfirmed.toLocaleString();
  totalDeathsSpan.innerHTML = data.Global.TotalDeaths.toLocaleString();
  totalRecoveredSpan.innerHTML = data.Global.TotalRecovered.toLocaleString();



  // Pizza Chart
  const pizzaDataGraph = {
    labels: [
      'Confirmados',
      'Recuperados',
      'Mortes'
    ],
    datasets: [{
      label: 'Distribuição de Novos Casos',
      data: [data.Global.NewConfirmed, data.Global.NewRecovered, data.Global.NewDeaths],
      backgroundColor: [
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)',
        'rgb(255, 205, 86)'
      ],
      hoverOffset: 4
    }]
  }
  const configPizza = {
    type: 'pie',
    data: pizzaDataGraph,
    options: {
      responsive: false,
    }
  }
  let pizzaChart = new Chart(document.getElementById('pizzaGraph'), configPizza);

  // Bar Chart
  const dataBarGraph = await getMostDeathsByCountries();
  const labelsBar = [];
  const dataDeathsBar = [];
  dataBarGraph.forEach((data) => labelsBar.push(data.name));
  dataBarGraph.forEach((data) => dataDeathsBar.push(data.deaths));

  const dataBar = {
    labels: labelsBar,
    datasets: [{
      label: 'Países',
      data: dataDeathsBar,
      backgroundColor: [
        'rgba(255, 99, 132, 1)'
      ],

      borderWidth: 1
    }]
  };
  const configBar = {
    type: 'bar',
    data: dataBar,
    options: {
      responsive: false,
      scales: {
        y: {
          beginAtZero: true
        }
      },
    },
  };
  let barChart = new Chart(document.getElementById('barGraph'), configBar);
  
}

async function drawCountriesDashboard(data, scope) {
  const labels = [];
  const allDataValues = [];
  let averageArray = [];

  let firstDatasetLabel = ''
  let secondDatasetLabel = ''

  data.forEach((item) => {
    let formatDate = ((new Date(item.date).getDate() )) + "/" + ((new Date(item.date).getMonth() + 1)) + "/" + new Date(item.date).getFullYear(); 
    labels.push(formatDate);
    allDataValues.push(item.data);
    averageArray.push(0);
  });

  let average = allDataValues.reduce((total, current) => total += current) / allDataValues.length;
  averageArray = averageArray.map((item) => averageArray[averageArray.indexOf(item)] = average);
  console.log(averageArray);

  if(scope == 'confirmed') {
    firstDatasetLabel = 'Número de Casos Confirmados'
    secondDatasetLabel = 'Média de Casos Confirmados'
  } else if (scope == 'deaths') {
    firstDatasetLabel = 'Número de Mortes'
    secondDatasetLabel = 'Média de Mortes'
  } else {
    firstDatasetLabel = 'Número de Casos Recuperados'
    secondDatasetLabel = 'Média de Casos Recuperados'
  }

  const lineGraphData = {
    labels: labels,
    datasets: [{
      label: firstDatasetLabel,
      data: allDataValues,
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    },
    {
      label: secondDatasetLabel,
      data: averageArray,
      fill: false,
      borderColor: 'rgb(75, 35, 154)',
      tension: 0.1
    }]
  };

  const config = {
    type: 'line',
    data: lineGraphData,
    options: {
      responsive: false
    }
  };

  lineChart = new Chart(document.getElementById('lineChart'), config);
}