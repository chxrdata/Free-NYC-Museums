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

map.on('load', async () => {

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
  
  map.addSource('museums', {
      'type': 'geojson',
      'data': 'FreeMuseums030726.geojson',
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

  // set filter defaults

  let daysToInclude = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  let typesToInclude = ['Art', 'Culture', 'Garden', 'History', 'Children', 'Zoo'];
  let residentOrVisitorFilter = ['!=', ['get', 'residentOnlyGroup'], 'Y'];
  let programsToInclude = [];
  let programFilter = [
    ['!=', ['get', 'culturePass'], 'Y'],
    ['!=', ['get', 'coolCulture'], 'Y'],
    ['!=', ['get', 'blueStar'], 'Y'],
    ['!=', ['get', 'SNAP/EBT'], 'Y'],
  ];
  let selectedStopFilterOut = ['literal', true];
  let filter = [];

  // program filter

  // explanation:
  // A: Always show
  // X: Exclude if its program is checked (on non-program row)
  // O: Include if its program is checked (on non-program row)
  // Y: Include if its program is checked (on program-specific row)
  // N: Exclude if its program is not checked (on program-specific row) (serves same function as O really, just used as marker)
  function updateProgramFilter() {
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

  // main filter
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

  updateFilter();

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

  })

  // type filtering

  document.getElementById('type-checkboxes').addEventListener('change', (e) => {
    const checkedType = e.target.value;
    const checkedState = e.target.checked;

    if (checkedState) {
      if (!typesToInclude.includes(checkedType)) {
        typesToInclude.push(checkedType)
      }
    } else {
      const index = typesToInclude.indexOf(checkedType);
      if (index > -1) {
        typesToInclude.splice(index, 1);
      }
    }

    updateFilter();

  })

  // visitor status filtering

  document.getElementById('visitor-status-buttons').addEventListener('change', () => {
    const visitorState = document.getElementById('visitor').checked;

    if (visitorState) {
      residentOrVisitorFilter = ['!=', ['get', 'residentOnlyGroup'], 'Y'];
    } else {
      residentOrVisitorFilter = ['!=', ['get', 'visitorOnly'], 'Y'];
    }

    updateFilter();

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

  })

  map.on('click', 'places', (e) => {

    //show selected icon
    selectedFeatureId = e.features[0].properties.id;
    map.setFilter('selectedStop', ['==', ['get', 'id'], selectedFeatureId]);
    selectedStopFilterOut = ['!=', ['get', 'id'], selectedFeatureId];
    updateFilter();
    const bottomPadding = window.innerHeight / 4;
    map.flyTo({
      center: e.features[0].geometry.coordinates,
      zoom: 14,
      curve: 1,
      padding: {top: 0, bottom:bottomPadding, left: 0, right: 0}
    });

    //fetch HTML elements
    const popup = document.getElementById('popup');
    const HTMLtitle = document.getElementById('popup-title');
    const HTMLsubtitle = document.getElementById('popup-subtitle');
    const HTMLtext = document.getElementById('popup-text');
    const HTMLbuttonLink = document.getElementById('info-btn-link');

    //fetch geoJSON properties
    const name = e.features[0].properties.name;
    const type = e.features[0].properties.type;
    const start = e.features[0].properties.start;
    const end = e.features[0].properties.end;
    let description = e.features[0].properties.description;
    const note = e.features[0].properties.note;
    const link = e.features[0].properties.link;
    const admission = e.features[0].properties.suggestedAdmission;
    const frequency = e.features[0].properties.dayWeekOrMonth;
    const daysObj = {
      sunday: e.features[0].properties.sun,
      monday: e.features[0].properties.mon,
      tuesday: e.features[0].properties.tue,
      wednesday: e.features[0].properties.wed,
      thursday: e.features[0].properties.thu,
      friday: e.features[0].properties.fri,
      saturday: e.features[0].properties.sat
    };
    const programsObj = {
      culturePass: e.features[0].properties.culturePass,
      coolCulture: e.features[0].properties.coolCulture,
      blueStar: e.features[0].properties.blueStar,
      snapEbt: e.features[0].properties['SNAP/EBT'],
    }
    const iconUrl = 'icons/' + type + '.webp';

    //modify week calendar
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

    //set up hours label
    let hoursLabel = ''
    if (frequency != 'Daily') {
      hoursLabel = 'Free hours';
    } else {
      hoursLabel = 'Hours';
    }

    //set up suggested admission label
    let suggestedAdmissionStr = ''

    if (admission != 'N') {
      suggestedAdmissionStr = 'Suggested admission' + admission
    }

    //set up description
    if (description.length + note.length > 250 ) {
      const numToSlice = 250 - note.length;
      description = description.slice(0, numToSlice) + '..."';
    }

    //set up start and end times
    const startTime =  start.slice(-11, -6) + start.slice(-2, -1) + 'M';
    const endTime = end.slice(-11, -6) + end.slice(-2, -1) + 'M';

    //set innerHTML of elements
    HTMLtitle.innerHTML = name;
    HTMLsubtitle.innerHTML = '<img class="icon" src="' + iconUrl + '">' + type + ' | ' + hoursLabel +  ': ' + startTime + '&ndash;' + endTime + '<br>' + programsListStr + suggestedAdmissionStr;
    HTMLtext.innerHTML = description + '<br><br>' + note;
    HTMLbuttonLink.setAttribute('href', link)

    popup.style.bottom = "0px";

  })

  function deselect() {
    const popup = document.getElementById('popup');
    popup.style.bottom = "-80vh";
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
      }
  });

  // or on close button
  const closeBtn = document.getElementById('close-btn');
  closeBtn.addEventListener('click', () => {
      deselect();
    }
  );

})
