// SETUP

import "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";

const bounds = [
  [-74.39579758538115, 40.50230575487687], // Southwest coordinates
  [-73.64742517060498, 40.99226057434001] // Northeast coordinates
];

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [-73.94356413203386, 40.75391772516758],
  zoom: 12,
  maxBounds: bounds
});

const favicons = [
  'icons/favicon1.svg',
  'icons/favicon2.svg',
  'icons/favicon3.svg',
  'icons/favicon4.svg',
  'icons/favicon5.svg',
  'icons/favicon6.svg',
]

document.addEventListener('DOMContentLoaded', () => {
  const randomFaviconUrl = favicons[Math.floor(Math.random() * favicons.length)];
  const favicon = document.getElementById('favicon');
  favicon.setAttribute('href', randomFaviconUrl);
  console.log(randomFaviconUrl);
})

map.on('load', async () => {

  // LOAD ICONS

  const ArtImg = await map.loadImage('icons/Art.webp');
  map.addImage('Art', ArtImg.data);
  const ZooImg = await map.loadImage('icons/Zoo.webp');
  map.addImage('Zoo', ZooImg.data);
  const cultureImg = await map.loadImage('icons/Culture.webp');
  map.addImage('Culture', cultureImg.data);
  const gardenImg = await map.loadImage('icons/Garden.webp');
  map.addImage('Garden', gardenImg.data);
  const HistoryImg = await map.loadImage('icons/History.webp');
  map.addImage('History', HistoryImg.data);
  const ChildrenImg = await map.loadImage('icons/Children.webp');
  map.addImage('Children', ChildrenImg.data);

  const ArtSelected = await map.loadImage('icons/ArtSelected.png');
  map.addImage('ArtSelected', ArtSelected.data);
  const CultureSelected = await map.loadImage('icons/CultureSelected.png');
  map.addImage('CultureSelected', CultureSelected.data);
  const GardenSelected = await map.loadImage('icons/GardenSelected.png');
  map.addImage('GardenSelected', GardenSelected.data);
  const HistorySelected = await map.loadImage('icons/HistorySelected.png');
  map.addImage('HistorySelected', HistorySelected.data);
  const ChildrenSelected = await map.loadImage('icons/ChildrenSelected.png');
  map.addImage('ChildrenSelected', ChildrenSelected.data);
  const ZooSelected = await map.loadImage('icons/ZooSelected.png');
  map.addImage('ZooSelected', ZooSelected.data);

  // RENDER MAPS

  map.addSource('museums', {
    'type': 'geojson',
    'data': 'FreeMuseums051526.geojson',
  });

  map.addLayer({
    'id': 'places',
    'type': 'symbol',
    'source': 'museums',
    'layout': {
      'icon-image': ['get', 'type'],
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 0.4,
        20, 1
      ],
      'icon-overlap': 'always'
    },
  });

  map.addLayer({ //selected icon layer
    'id': 'selectedStop',
    'type': 'symbol',
    'source': 'museums',
    'layout': {
      'icon-image': '{type}' + 'Selected',
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 0.15,
        20, 0.3
      ],
      'icon-overlap': 'always'
    },
    'filter': ['==', ['get', 'id'], ''],
  });

  //used in feature click listener
  let selectedFeatureId = null;

  // FILTERS
  // Note: filters used with MapLibre have standard names.
  // Filters used on geoJSON for search feature end in 'search'.

  // set filter defaults
  let daysToInclude = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  let typesToInclude = ['Art', 'Culture', 'Garden', 'History', 'Children', 'Zoo'];
  let residentOrVisitorFilter = ['!=', ['get', 'residentOnlyGroup'], 'Y'];
  let residentOrVisitorFilterSearch = p => p.residentOnlyGroup !== 'Y';
  let programsToInclude = [];
  let programFilter = [
    ['!=', ['get', 'culturePass'], 'Y'],
    ['!=', ['get', 'coolCulture'], 'Y'],
    ['!=', ['get', 'blueStar'], 'Y'],
    ['!=', ['get', 'SNAP/EBT'], 'Y'],
  ];
  let programFilterSearch = p =>
    p.culturePass !== 'Y' &&
    p.coolCulture !== 'Y' &&
    p.blueStar !== 'Y' &&
    p['SNAP/EBT'] !== 'Y';
  let selectedStopFilterOut = ['literal', true];
  let filter = [];
  let searchFilter = [];

  // program filter

  // explanation:
  // A: Always show
  // X: Exclude if its program is checked (on non-program row)
  // O: Include if its program is checked (on non-program row)
  // Y: Include if its program is checked (on program-specific row)
  // N: Exclude if its program is not checked (on program-specific row) (serves same function as O really, just used as marker)
  function updateProgramFilter() { //map filter
    if (programsToInclude.length > 0) {
      programFilter = [
        ['any',
          ...programsToInclude.map(program => ['==', ['get', program], 'Y']),
          ...programsToInclude.map(program => ['==', ['get', program], 'A']),
          ...programsToInclude.map(program => ['==', ['get', program], 'O'])
        ],
        ['all',
          ...programsToInclude.map(program => ['!=', ['get', program], 'X'])
        ],
      ]
    } else {
      programFilter = [
        ['!=', ['get', 'culturePass'], 'Y'],
        ['!=', ['get', 'coolCulture'], 'Y'],
        ['!=', ['get', 'blueStar'], 'Y'],
        ['!=', ['get', 'SNAP/EBT'], 'Y'],
      ]
    }
  }

  function updateProgramFilterSearch() { //search filter
    if (programsToInclude.length > 0) {
      programFilterSearch = p => {
        const orArr = programsToInclude.some(program => p[program] == 'Y' || p[program] == 'A' || p[program] == 'O');
        const notArr = programsToInclude.every(program => p[program] !== 'X');
        return orArr && notArr;
      }
    } else {
      programFilterSearch = p =>
        p.culturePass !== 'Y' &&
        p.coolCulture !== 'Y' &&
        p.blueStar !== 'Y' &&
        p['SNAP/EBT'] !== 'Y';
    };
  }

  // main filter

  let filteredFeatures = undefined; //map filter

  function updateFilter() {
    filter = [
      'all',
      [
        'any',
        ...daysToInclude.map(day => ['==', ['get', day], 'Y'])
      ],
      [
        'any',
        ...typesToInclude.map(type => ['==', ['get', 'type'], type])
      ],
      residentOrVisitorFilter,
      ...programFilter,
      selectedStopFilterOut
    ];
    map.setFilter('places', filter);
  }

  let filteredFeaturesSearch = undefined; //search filter

  const geoJSON = await fetch('./FreeMuseums051526.geojson').then(r => r.json());

  function updateSearchFilter() {
    filteredFeaturesSearch = geoJSON.features.filter(f => {
      const p = f.properties;
      return (
        daysToInclude.some(day => p[day] === 'Y') &&
        typesToInclude.includes(p.type) &&
        residentOrVisitorFilterSearch(p) &&
        programFilterSearch(p)
      );
    })

  }

  updateFilter();
  updateSearchFilter();

  // day filtering
  document.getElementById('day-checkboxes').addEventListener('change', (e) => {
    const checkedDay = e.target.value;
    const checkedState = e.target.checked;

    if (checkedState) {
      if (!daysToInclude.includes(checkedDay)) {
        daysToInclude.push(checkedDay)
      }
    } else {
      const index = daysToInclude.indexOf(checkedDay);
      if (index > -1) {
        daysToInclude.splice(index, 1);
      }
    }

    updateFilter();
    updateSearchFilter();

  })

  // type filtering

  const typesValueArr = ['Art', 'Culture', 'Garden', 'History', 'Children', 'Zoo'];
  let typesIsolatingState = false

  document.getElementById('type-checkboxes').addEventListener('change', (e) => {
    closeSearchItems();
    deselect();

    const checkedValue = e.target.value;
    const checkedState = e.target.checked;

    if ((!checkedState && !typesIsolatingState) || (checkedState && typesIsolatingState)) {
      for (const value of typesValueArr) {
        document.getElementById(value.toLowerCase()).checked = false;
      }
      document.getElementById(checkedValue.toLowerCase()).checked = true;
      typesToInclude = [checkedValue];
      typesIsolatingState = true;
    } else if (!checkedState && typesIsolatingState) {
      for (const value of typesValueArr) {
        document.getElementById(value.toLowerCase()).checked = true;
      }
      typesToInclude = ['Art', 'Culture', 'Garden', 'History', 'Children', 'Zoo'];
      typesIsolatingState = false;
    }

    updateFilter();
    updateSearchFilter();
  })

  // visitor status filtering
  document.getElementById('visitor-status-buttons').addEventListener('change', () => {
    const visitorState = document.getElementById('visitor').checked;

    if (visitorState) {
      residentOrVisitorFilter = ['!=', ['get', 'residentOnlyGroup'], 'Y'];
      residentOrVisitorFilterSearch = p => p.residentOnlyGroup !== 'Y';
    } else {
      residentOrVisitorFilter = ['!=', ['get', 'visitorOnly'], 'Y'];
      residentOrVisitorFilterSearch = p => p.visitorOnly !== 'Y';
    }

    updateFilter();
    updateSearchFilter();

  })

  // program filtering
  document.getElementById('program-checkboxes').addEventListener('change', (e) => {
    const checkedProgram = e.target.value;
    const checkedState = e.target.checked;

    if (checkedState) {
      if (!programsToInclude.includes(checkedProgram)) {
        programsToInclude.push(checkedProgram)
      }
    } else {
      const index = programsToInclude.indexOf(checkedProgram);
      if (index > -1) {
        programsToInclude.splice(index, 1);
      }
    }

    updateProgramFilter()
    updateFilter();
    updateProgramFilterSearch();
    updateSearchFilter();

  })

  // day checklist open and close behavior
  function openDayChecklist() {
    closeSearchItems();
    const dayContainer = document.getElementById('day-checkboxes-container');
    const img = document.getElementById('day-btn-img');
    dayContainer.style['max-height'] = '80dvh';
    img.style.transform = 'scaleY(-1)';
  }

  function closeDayChecklist() {
    const dayContainer = document.getElementById('day-checkboxes-container');
    const img = document.getElementById('day-btn-img');
    if (window.innerWidth <= 768) {
      dayContainer.style['max-height'] = '2.6rem';
    } else {
      dayContainer.style['max-height'] = '3rem';
    }
    setTimeout(function () {
      img.style.transform = 'scaleY(1)';
    }, 200);
  }

  const dayBtn = document.getElementById('day-btn');
  dayBtn.addEventListener('click', () => {
    deselect()
    const dayContainer = document.getElementById('day-checkboxes-container');
    if (dayContainer.style['max-height'] != '80dvh') {
      openDayChecklist()
    } else {
      closeDayChecklist()
    }

  });

  // Close search up here
  const searchInput = document.getElementById('searchedFeature');
  const autocompleteList = document.getElementById('autocomplete-list');

  function closeSearchItems() {
    searchInput.value = '';
    autocompleteList.replaceChildren();
    searchInput.style.borderTopRightRadius = '20px';
    searchInput.style.borderTopLeftRadius = '20px';
  }

  // SELECT FEATURE BEHAVIOR

  function selectFeature(feature) {
    closeDayChecklist();
    closeSearchItems();

    //show selected icon
    selectedFeatureId = feature.properties.id;
    map.setFilter('selectedStop', ['==', ['get', 'id'], selectedFeatureId]);
    selectedStopFilterOut = ['!=', ['get', 'id'], selectedFeatureId];
    updateFilter();
    let bottomPadding = 0
    if (window.innerWidth <= (1000 + (0.08 * window.innerWidth))) {
      bottomPadding = window.innerHeight / 4;
    } //this only adds bottom padding for popup if the popup would cover the selector
    if (map.getZoom() < 14) {
      map.flyTo({
        center: feature.geometry.coordinates,
        zoom: 14,
        padding: { top: 0, bottom: bottomPadding, left: 0, right: 0 }
      });
    } else {
      map.flyTo({
        center: feature.geometry.coordinates,
        curve: 1,
        padding: { top: 0, bottom: bottomPadding, left: 0, right: 0 },
        speed: 0.6
      });
    }

    //fetch HTML elements
    const popup = document.getElementById('popup');
    const HTMLtitle = document.getElementById('popup-title');
    const HTMLsubtitle = document.getElementById('popup-subtitle');
    const HTMLtext = document.getElementById('popup-text');
    const HTMLbuttonLink = document.getElementById('info-btn-link');

    //fetch geoJSON properties
    const name = feature.properties.name;
    const type = feature.properties.type;
    const start = feature.properties.start;
    const end = feature.properties.end;
    let description = feature.properties.description;
    const note = feature.properties.note;
    const link = feature.properties.link;
    const admission = feature.properties.suggestedAdmission;
    const frequency = feature.properties.dayWeekOrMonth;
    const weekdaysBox = document.getElementById('weekdays-mobile')
    const daysObj = {
      sunday: feature.properties.sun,
      monday: feature.properties.mon,
      tuesday: feature.properties.tue,
      wednesday: feature.properties.wed,
      thursday: feature.properties.thu,
      friday: feature.properties.fri,
      saturday: feature.properties.sat
    };
    const programsObj = {
      culturePass: feature.properties.culturePass,
      coolCulture: feature.properties.coolCulture,
      blueStar: feature.properties.blueStar,
      snapEbt: feature.properties['SNAP/EBT'],
    }
    const iconUrl = 'icons/' + type + '.webp';

    //modify week calendar
    weekdaysBox.style.visbility = 'visible';
    for (let day in daysObj) {
      let daySlashID = day + '-slash'
      const daySlashHTML = document.getElementById(daySlashID)
      if (daysObj[day] == 'N') {
        daySlashHTML.style.visibility = 'visible';
      } else {
        daySlashHTML.style.visibility = 'hidden';
      }
    }

    //set up programs label
    let programsList = [];
    for (let program in programsObj) {
      if (programsObj[program] == 'Y')
        switch (program) {
          case "culturePass":
            programsList.push("Culture Pass");
            break;
          case "coolCulture":
            programsList.push("Cool Culture");
            break;
          case "blueStar":
            programsList.push("Blue Star");
            break;
          case "SNAP/EBT":
            programsList.push("SNAP/EBT");
            break;
        }
    }

    if (programsList.length > 1) {
      const lastProgram = 'and ' + programsList.at(-1);
      programsList.splice(-1, 1, lastProgram)
    }

    let programsListStr = '';

    if (programsList.length > 2) {
      programsListStr = 'Free through ' + programsList.join(', ');
    } else if (programsList.length > 0) {
      programsListStr = 'Free through ' + programsList.join(' ');
    }

    //set up hours label and days caveat
    let hoursLabel = ''
    let daysCaveat = '';
    if (frequency != 'Daily') {
      hoursLabel = 'Free hours';
      daysCaveat = 'Weekday&#40;s&#41; shown are for free hours only. ';
    } else {
      hoursLabel = 'Hours';
    }

    //set up suggested admission label and days caveat
    let suggestedAdmissionStr = '';

    if (admission != 'N') {
      suggestedAdmissionStr = 'Suggested admission' + admission
    }

    //set up body text

    let bodyText = '';
    if (window.innerWidth <= 768) { //only cuts down decription on smaller screen sizes
      if (description.length + note.length > 300) {
        const numToSlice = 300 - note.length;
        description = description.slice(0, numToSlice) + '..."';
      }
    }

    if (note.length > 0) {
      bodyText = '<p>' + description + '</p><br><p class="p-tiny">Note: ' + daysCaveat + note + '</p>'
    } else if (daysCaveat.length > 0) {
      bodyText = '<p>' + description + '</p><br><p class="p-tiny">Note: ' + daysCaveat + '</p>'
    } else {
      bodyText = '<p>' + description + '</p>'
    }

    //set up start and end times
    const startTime = start.slice(-11, -6) + start.slice(-2, -1) + 'M';
    const endTime = end.slice(-11, -6) + end.slice(-2, -1) + 'M';

    //set innerHTML of elements
    HTMLtitle.innerHTML = name;
    HTMLsubtitle.innerHTML = '<img class="icon" src="' + iconUrl + '">' + type + ' | ' + hoursLabel + ': ' + startTime + '&ndash;' + endTime + '<br>' + programsListStr + suggestedAdmissionStr;
    HTMLtext.innerHTML = bodyText;
    HTMLbuttonLink.setAttribute('href', link)

    popup.style.visibility = 'visible';
    popup.style.bottom = '0px';

  }

  map.on('click', 'places', (e) => {
    selectFeature(e.features[0]);
  })

  //deselect feature behavior
  function deselect() {
    const popup = document.getElementById('popup');
    popup.style.bottom = "-80dvh";
    setTimeout(function () {
      popup.style.visibility = 'hidden';
    }, 600);
    const weekdaysBox = document.getElementById('weekdays-mobile')
    weekdaysBox.style.visbility = 'hidden';
    selectedStopFilterOut = ['literal', true];
    selectedFeatureId = null;
    map.setFilter('selectedStop', ['==', ['get', 'id'], selectedFeatureId]);
    updateFilter();
  }

  // close modal when clicking outside feature
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['places'] });
    if (features.length === 0) {
      deselect();
      closeSearchItems();
    }
  });

  // or on close button
  const closeBtn = document.getElementById('close-btn');
  closeBtn.addEventListener('click', deselect);

  // MENU ACTIONS
  const menuOpenBtn = document.getElementById('menu-btn');
  const menuCloseBtn = document.getElementById('menu-close-btn');
  const menu = document.getElementById('menu');
  const menuBackdrop = document.getElementById('menu-backdrop');

  function openMenu() {
    deselect();
    closeSearchItems();
    const dayContainer = document.getElementById('day-checkboxes-container');
    if (dayContainer.style['max-height'] == '80dvh') {
      closeDayChecklist()
    }
    menu.style.visibility = 'visible';
    menuBackdrop.style.visibility = 'visible';
    menu.style.right = '0';
    menuBackdrop.style.opacity = '0.5';
    menu.style.opacity = '1';
  }

  function closeMenu() {
    menuBackdrop.style.opacity = '0';
    setTimeout(function () {
      menu.style.visibility = 'hidden';
      menuBackdrop.style.visibility = 'hidden';
    }, 600);
    if (window.innerWidth <= 768) {
      setTimeout(function () {
        menu.style.opacity = '0';
      }, 600);
      menu.style.right = "-100vw";
    } else {
      menu.style.opacity = '0';
    }
  }

  menuOpenBtn.addEventListener('click', openMenu);
  menuCloseBtn.addEventListener('click', closeMenu);
  menuBackdrop.addEventListener('click', closeMenu);

  //SEARCH ACTIONS

  searchInput.addEventListener('input', (e) => {
    autocompleteList.replaceChildren();

    if (e.target.value != '') {
      closeDayChecklist();
      for (const feature of filteredFeaturesSearch) {
        if (autocompleteList.childElementCount < 10) {
          if (feature.properties.name.toLowerCase().split(' ').some(word => word.startsWith(e.target.value.toLowerCase()))) {
            const newItem = document.createElement('li');
            newItem.textContent = feature.properties.name;
            newItem.classList.add('autocomplete-item');
            switch (feature.properties.type) {
              case "Art": newItem.classList.add('autocomplete-art');
                break;
              case "Culture": newItem.classList.add('autocomplete-culture');
                break;
              case "Garden": newItem.classList.add('autocomplete-garden');
                break;
              case "History": newItem.classList.add('autocomplete-history');
                break;
              case "Children": newItem.classList.add('autocomplete-children');
            };
            autocompleteList.appendChild(newItem);
            newItem.addEventListener('click', () => {
              closeSearchItems();
              selectFeature(feature);
            })
          }
        }
      }
    } else {
      autocompleteList.replaceChildren();
    }

    // change search box border
    let borderRadius = '0'
    if (autocompleteList.childElementCount > 0) {
      borderRadius = '0';
    } else {
      borderRadius = '20px';
    }
    searchInput.style.borderTopRightRadius = borderRadius;
    searchInput.style.borderTopLeftRadius = borderRadius;
  }
  )

  //WINDOW RESIZE ACTIONS
  window.onresize = () => {
    const dayContainer = document.getElementById('day-checkboxes-container');
    if (dayContainer.style['max-height'] != '80dvh') {
      if (window.innerWidth <= 768) {
        dayContainer.style['max-height'] = '2.6rem';
      } else {
        dayContainer.style['max-height'] = '3rem';
      }
    }
  }

})
