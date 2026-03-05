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
  
  map.addSource('museums', {
      'type': 'geojson',
      'data': 'FreeMuseums030426.geojson',
    });

  map.addLayer({
      'id': 'places',
      'type': 'symbol',
      'source': 'museums',
      'layout': {
          'icon-image': '{type}',
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
        ...programFilter
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

})
