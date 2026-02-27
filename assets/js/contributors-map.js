// Contributors Map JavaScript - Using MapLibre GL (Globe) and OpenLayers (Flat Map)

class ContributorsMap {
  constructor(contributorsData, supportingData) {
    this.contributorsData = contributorsData;
    this.supportingData = supportingData || { features: [] };
    this.currentView = 'globe';
    this.globeMap = null;
    this.flatMap = null;
    this.vectorLayer = null;
    // Code contributor markers
    this.markers = [];
    this.flatMarkers = [];
    // Supporting contributor markers
    this.supportingMarkers = [];
    this.supportingFlatMarkers = [];
    this.isRotating = false;
    this.rotationAnimation = null;
    // Filter state
    this.showCodeContributors = true;
    this.showSupportingContributors = true;
    // Active popup tracking (for URL state)
    this.activeContributorId = null;
    this.activeSupportingId = null;
    
    this.init();
  }
  
  init() {
    this.readUrlState();
    this.setupEventListeners();
    this.initGlobeView();
  }
  
  setupEventListeners() {
    // View toggle buttons
    document.getElementById('globe-view-btn')?.addEventListener('click', () => {
      this.switchView('globe');
    });
    
    document.getElementById('flat-view-btn')?.addEventListener('click', () => {
      this.switchView('flat');
    });
    
    // Code contributor popup close
    document.getElementById('popup-close')?.addEventListener('click', () => {
      this.closePopup();
    });

    // Supporting contributor popup close
    document.getElementById('supporting-popup-close')?.addEventListener('click', () => {
      this.closePopup();
    });
    
    document.getElementById('popup-overlay')?.addEventListener('click', () => {
      this.closePopup();
    });

    // Category filter checkboxes
    document.getElementById('filter-code')?.addEventListener('change', (e) => {
      this.showCodeContributors = e.target.checked;
      this.updateAllMarkersVisibility();
      this.updateUrlState();
    });

    document.getElementById('filter-supporting')?.addEventListener('change', (e) => {
      this.showSupportingContributors = e.target.checked;
      this.updateAllMarkersVisibility();
      this.updateUrlState();
    });
  }
  
  switchView(view) {
    this.currentView = view;
    this.updateUrlState();
    
    const globeView = document.getElementById('globe-view');
    const flatView = document.getElementById('flat-map-view');
    const globeBtn = document.getElementById('globe-view-btn');
    const flatBtn = document.getElementById('flat-view-btn');
    
    if (view === 'globe') {
      globeView.style.display = 'block';
      flatView.style.display = 'none';
      globeBtn?.classList.add('active');
      flatBtn?.classList.remove('active');
      
      if (!this.globeMap) {
        this.initGlobeView();
      } else {
        this.globeMap.resize();
        this.updateMarkerVisibility();
      }
    } else {
      globeView.style.display = 'none';
      flatView.style.display = 'block';
      globeBtn?.classList.remove('active');
      flatBtn?.classList.add('active');
      
      if (!this.flatMap) {
        this.initFlatMap();
      } else {
        this.flatMap.updateSize();
        this.updateAllMarkersVisibility();
      }
    }
  }
  
  initGlobeView() {
    // Use MapLibre GL v5.16.0 with globe projection
    this.globeMap = new maplibregl.Map({
      container: 'globe-view',
      zoom: 2.2,
      center: [150, 10], // Australia coordinates
      style: {
        version: 8,
        projection: {
          type: 'globe'
        },
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
            maxzoom: 19
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
        }],
        sky: {
          'atmosphere-blend': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              5, 1,
              7, 0
          ]
        },
      },
      maxZoom: 18,
      minZoom: 0
    });
    
    this.globeMap.on('load', () => {
      // Add supporting first so code contributors render on top
      this.addSupportingContributorsToMapLibre();
      this.addContributorsToMapLibre();
      if (this.currentView === 'flat') {
        this.switchView('flat');
      } else {
        this._restorePopup();
        setTimeout(() => this.startRotation(), 500);
      }
    });
    
    // Stop rotation on any user interaction
    this.globeMap.on('mousedown', () => this.stopRotation());
    this.globeMap.on('touchstart', () => this.stopRotation());
    this.globeMap.on('wheel', () => this.stopRotation());
    this.globeMap.on('dblclick', () => this.stopRotation());
  }
  
  // ─── Code Contributors ──────────────────────────────────────────────────────

  addContributorsToMapLibre() {
    const contributorsWithLocation = this.contributorsData.features
      .filter(f => f.geometry && f.geometry.coordinates)
      .sort((a, b) => a.properties.total_contributions - b.properties.total_contributions);
    
    this.globeMap.addSource('contributors', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: contributorsWithLocation }
    });
    
    contributorsWithLocation.forEach((contributor) => {
      const coords = contributor.geometry.coordinates;
      const size = this.getMarkerSize(contributor.properties.total_contributions) * 3;
      const avatarUrl = contributor.properties.avatar_url || '/img/default-avatar.png';
      const isHonorary = contributor.properties.is_honorary || false;
      const honoraryIcon = contributor.properties.honorary_icon || '';
      
      const el = document.createElement('div');
      el.className = 'maplibre-marker';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.cursor = 'pointer';
      el.style.transition = 'opacity 0.3s ease';
      
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.border = isHonorary ? '3px solid #ee7913' : '2px solid #589632';
      img.style.boxShadow = isHonorary ? '0 0 15px rgba(238,121,19,0.8)' : '0 0 10px rgba(88,150,50,0.8)';
      img.style.objectFit = 'cover';
      img.style.background = 'white';
      img.style.display = 'block';
      img.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
      wrapper.appendChild(img);
      
      if (isHonorary && honoraryIcon) {
        const badge = document.createElement('div');
        badge.style.position = 'absolute';
        badge.style.top = '-4px';
        badge.style.left = '-4px';
        badge.style.fontSize = '1rem';
        badge.style.filter = 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))';
        badge.style.zIndex = '10';
        badge.textContent = honoraryIcon;
        wrapper.appendChild(badge);
      }
      
      el.appendChild(wrapper);
      
      el.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.15)';
        img.style.boxShadow = isHonorary ? '0 0 20px rgba(238,121,19,0.9)' : '0 0 15px rgba(88,150,50,0.9)';
      });
      el.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
        img.style.boxShadow = isHonorary ? '0 0 15px rgba(238,121,19,0.8)' : '0 0 10px rgba(88,150,50,0.8)';
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showContributorPopup(contributor.properties, e);
      });
      
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coords)
        .addTo(this.globeMap);
      
      this.markers.push({ marker, coords, element: el });
    });
    
    this.globeMap.on('move', () => this.updateMarkerVisibility());
    this.globeMap.on('moveend', () => this.updateMarkerVisibility());
    this.globeMap.on('click', (e) => {
      const features = this.globeMap.queryRenderedFeatures(e.point);
      if (features.length === 0) this.closePopup();
    });
    
    this.updateMarkerVisibility();
  }

  // ─── Supporting Contributors ─────────────────────────────────────────────────

  _createSupportingMarkerElement(props, size) {
    const isOrg = props.is_organization || false;
    const avatarUrl = props.avatar_img || '/img/default-avatar.png';

    const el = document.createElement('div');
    el.className = 'maplibre-marker supporting-globe-marker';
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.cursor = 'pointer';
    el.style.transition = 'opacity 0.3s ease';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';

    const img = document.createElement('img');
    img.src = avatarUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.borderRadius = isOrg ? '10%' : '50%';
    img.style.border = '2px solid #f39c12';
    img.style.boxShadow = '0 0 10px rgba(243,156,18,0.7)';
    img.style.objectFit = 'cover';
    img.style.background = 'white';
    img.style.display = 'block';
    img.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
    wrapper.appendChild(img);

    // "S" badge — top-right corner
    const badge = document.createElement('div');
    badge.className = 'supporting-s-badge-marker';
    badge.textContent = 'S';
    wrapper.appendChild(badge);

    el.appendChild(wrapper);

    el.addEventListener('mouseenter', () => {
      img.style.transform = 'scale(1.15)';
      img.style.boxShadow = '0 0 18px rgba(243,156,18,0.9)';
    });
    el.addEventListener('mouseleave', () => {
      img.style.transform = 'scale(1)';
      img.style.boxShadow = '0 0 10px rgba(243,156,18,0.7)';
    });

    return { el, img };
  }

  addSupportingContributorsToMapLibre() {
    const features = this.supportingData.features
      .filter(f => f.geometry && f.geometry.coordinates);

    features.forEach((contributor) => {
      let coords = [...contributor.geometry.coordinates];
      // Auto-fix swapped [lat, lng] → [lng, lat] (GeoJSON requires [lng, lat])
      if (coords[1] > 90 || coords[1] < -90) {
        console.warn(`Auto-fixing swapped coordinates for "${contributor.properties.name}": [${coords[0]}, ${coords[1]}] → [${coords[1]}, ${coords[0]}]`);
        coords = [coords[1], coords[0]];
      }
      if (coords[1] > 90 || coords[1] < -90 || coords[0] > 180 || coords[0] < -180) {
        console.warn(`Skipping "${contributor.properties.name}": invalid coordinates [${coords[0]}, ${coords[1]}]`);
        return;
      }
      const { el } = this._createSupportingMarkerElement(contributor.properties, 36);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSupportingContributorPopup(contributor.properties, e);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coords)
        .addTo(this.globeMap);

      this.supportingMarkers.push({ marker, coords, element: el });
    });
  }

  addSupportingContributorsToOpenLayers() {
    const features = this.supportingData.features
      .filter(f => f.geometry && f.geometry.coordinates);

    features.forEach((contributor) => {
      let coords = [...contributor.geometry.coordinates];
      // Auto-fix swapped [lat, lng] → [lng, lat] (GeoJSON requires [lng, lat])
      if (coords[1] > 90 || coords[1] < -90) {
        console.warn(`Auto-fixing swapped coordinates for "${contributor.properties.name}": [${coords[0]}, ${coords[1]}] → [${coords[1]}, ${coords[0]}]`);
        coords = [coords[1], coords[0]];
      }
      if (coords[1] > 90 || coords[1] < -90 || coords[0] > 180 || coords[0] < -180) {
        console.warn(`Skipping "${contributor.properties.name}": invalid coordinates [${coords[0]}, ${coords[1]}]`);
        return;
      }
      const { el } = this._createSupportingMarkerElement(contributor.properties, 36);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSupportingContributorPopup(contributor.properties, e);
      });

      const overlay = new ol.Overlay({
        position: ol.proj.fromLonLat(coords),
        positioning: 'center-center',
        element: el,
        stopEvent: false
      });

      this.flatMap.addOverlay(overlay);
      // Set z-index on the OL wrapper so supporting stays below code contributors
      const supportingWrapper = overlay.getElement()?.parentElement;
      if (supportingWrapper) supportingWrapper.style.zIndex = '1';
      this.supportingFlatMarkers.push({ overlay, element: el });
    });
  }
  
  // ─── Marker Visibility ───────────────────────────────────────────────────────

  _isOnVisibleHemisphere(coords) {
    const center = this.globeMap.getCenter();
    const [lng, lat] = coords;
    const centerLng = center.lng;
    const centerLat = center.lat;

    let normalizedDLng = lng - centerLng;
    while (normalizedDLng > 180) normalizedDLng -= 360;
    while (normalizedDLng < -180) normalizedDLng += 360;

    const lat1Rad = centerLat * Math.PI / 180;
    const lat2Rad = lat * Math.PI / 180;
    const dLat = lat - centerLat;
    const dLngRad = normalizedDLng * Math.PI / 180;

    const a = Math.sin(dLat * Math.PI / 360) ** 2 +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLngRad / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = c * 180 / Math.PI;
    return distance <= 85;
  }

  updateMarkerVisibility() {
    if (!this.globeMap) return;

    this.markers.forEach(({ coords, element }) => {
      const visible = this.showCodeContributors && this._isOnVisibleHemisphere(coords);
      element.style.opacity = visible ? '1' : '0';
      element.style.pointerEvents = visible ? 'auto' : 'none';
      element.style.visibility = visible ? 'visible' : 'hidden';
    });

    this.supportingMarkers.forEach(({ coords, element }) => {
      const visible = this.showSupportingContributors && this._isOnVisibleHemisphere(coords);
      element.style.opacity = visible ? '1' : '0';
      element.style.pointerEvents = visible ? 'auto' : 'none';
      element.style.visibility = visible ? 'visible' : 'hidden';
    });
  }

  updateAllMarkersVisibility() {
    if (this.currentView === 'globe') {
      this.updateMarkerVisibility();
    } else {
      this.flatMarkers.forEach(({ element }) => {
        element.style.display = this.showCodeContributors ? 'block' : 'none';
      });
      this.supportingFlatMarkers.forEach(({ element }) => {
        element.style.display = this.showSupportingContributors ? 'block' : 'none';
      });
    }
  }
  
  // ─── Flat Map ────────────────────────────────────────────────────────────────

  initFlatMap() {
    const extent = ol.proj.transformExtent([-180, -85, 180, 85], 'EPSG:4326', 'EPSG:3857');
    
    const view = new ol.View({
      center: ol.proj.fromLonLat([0, 20]),
      zoom: 2,
      extent: extent,
      constrainOnlyCenter: false
    });
    
    this.flatMap = new ol.Map({
      target: 'flat-map-view',
      layers: [new ol.layer.Tile({ source: new ol.source.OSM() })],
      view: view
    });
    
    this.flatMap.on('click', (evt) => {
      let clickedOnOverlay = false;
      this.flatMap.getOverlays().forEach(overlay => {
        const element = overlay.getElement();
        if (element && element.contains(evt.originalEvent.target)) {
          clickedOnOverlay = true;
        }
      });
      if (!clickedOnOverlay) this.closePopup();
    });
    
    // Add supporting first so code contributors render on top
    this.addSupportingContributorsToOpenLayers();
    this.addContributorsToOpenLayers();
    // Apply current filter state to freshly-added markers
    this.updateAllMarkersVisibility();
    this._restorePopup();
  }
  
  addContributorsToOpenLayers() {
    const contributorsWithLocation = this.contributorsData.features
      .filter(f => f.geometry && f.geometry.coordinates);
    
    contributorsWithLocation.forEach((contributor) => {
      const coords = contributor.geometry.coordinates;
      const size = this.getMarkerSize(contributor.properties.total_contributions) * 3;
      const avatarUrl = contributor.properties.avatar_url || '/img/default-avatar.png';
      const isHonorary = contributor.properties.is_honorary || false;
      const honoraryIcon = contributor.properties.honorary_icon || '';
      
      const el = document.createElement('div');
      el.className = 'ol-marker';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.cursor = 'pointer';
      
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.border = isHonorary ? '3px solid #ee7913' : '2px solid #589632';
      img.style.boxShadow = isHonorary ? '0 0 15px rgba(238,121,19,0.8)' : '0 0 10px rgba(88,150,50,0.8)';
      img.style.objectFit = 'cover';
      img.style.background = 'white';
      img.style.display = 'block';
      img.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
      el.appendChild(img);
      
      if (isHonorary && honoraryIcon) {
        const badge = document.createElement('div');
        badge.style.position = 'absolute';
        badge.style.top = '-4px';
        badge.style.left = '-4px';
        badge.style.fontSize = '1rem';
        badge.style.filter = 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))';
        badge.style.zIndex = '10';
        badge.textContent = honoraryIcon;
        el.appendChild(badge);
      }
      
      el.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.15)';
        img.style.boxShadow = isHonorary ? '0 0 20px rgba(238,121,19,0.9)' : '0 0 15px rgba(88,150,50,0.9)';
      });
      el.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
        img.style.boxShadow = isHonorary ? '0 0 15px rgba(238,121,19,0.8)' : '0 0 10px rgba(88,150,50,0.8)';
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showContributorPopup(contributor.properties, e);
      });
      
      const overlay = new ol.Overlay({
        position: ol.proj.fromLonLat(coords),
        positioning: 'center-center',
        element: el,
        stopEvent: false
      });
      
      this.flatMap.addOverlay(overlay);
      // Set z-index on the OL wrapper so code contributors stay above supporting
      const codeWrapper = overlay.getElement()?.parentElement;
      if (codeWrapper) codeWrapper.style.zIndex = '2';
      this.flatMarkers.push({ overlay, element: el });
    });
  }
  
  // ─── Size helper ─────────────────────────────────────────────────────────────

  getMarkerSize(contributions) {
    if (contributions > 10000) return 28;
    if (contributions > 5000) return 22;
    if (contributions > 1000) return 18;
    if (contributions > 500) return 14;
    return 12;
  }
  
  // ─── Popups ──────────────────────────────────────────────────────────────────

  showContributorPopup(contributor, event) {
    const popup = document.getElementById('contributor-popup');
    const popupCard = document.getElementById('popup-card');
    
    if (!popup) return;
    
    const isHonorary = contributor.is_honorary || false;
    const honoraryIcon = contributor.honorary_icon || '';
    const honoraryTitle = contributor.honorary_title || '';
    
    if (isHonorary) {
      popupCard.classList.add('honorary-member');
    } else {
      popupCard.classList.remove('honorary-member');
    }
    
    document.getElementById('popup-avatar').src = contributor.avatar_url || '/img/default-avatar.png';
    
    const avatarContainer = popup.querySelector('.avatar-container');
    let honoraryBadge = avatarContainer.querySelector('.honorary-badge');
    let honoraryInfo = avatarContainer.querySelector('.honorary-info');
    
    if (isHonorary) {
      if (!honoraryBadge) {
        honoraryBadge = document.createElement('span');
        honoraryBadge.className = 'honorary-badge';
        avatarContainer.appendChild(honoraryBadge);
      }
      honoraryBadge.textContent = honoraryIcon;
      if (!honoraryInfo) {
        honoraryInfo = document.createElement('div');
        honoraryInfo.className = 'honorary-info';
        avatarContainer.appendChild(honoraryInfo);
      }
      honoraryInfo.innerHTML = `<p class="is-size-6 has-text-grey">${honoraryTitle}</p>`;
    } else {
      if (honoraryBadge) honoraryBadge.remove();
      if (honoraryInfo) honoraryInfo.remove();
    }
    
    const usernameLink = document.getElementById('popup-username-link');
    usernameLink.textContent = contributor.login;
    usernameLink.href = `https://github.com/${contributor.login}`;
    
    document.getElementById('popup-total-contributions').textContent = 
      contributor.total_contributions.toLocaleString();
    
    const thematicsList = document.getElementById('popup-thematics-list');
    thematicsList.innerHTML = '';
    
    const standardProps = ['login', 'avatar_url', 'total_contributions', 'has_github_account'];
    const thematics = [];
    Object.keys(contributor).forEach(key => {
      if (!standardProps.includes(key) && typeof contributor[key] === 'number' && contributor[key] > 0) {
        thematics.push({ name: key, count: contributor[key] });
      }
    });
    thematics.sort((a, b) => b.count - a.count);
    
    thematics.forEach(thematic => {
      const badge = document.createElement('span');
      badge.className = `contributor-badge contributor-badge-${thematic.name}`;
      
      let icon = '', label = '';
      if (thematic.name === 'documentation') { icon = '<i class="fas fa-book mr-1"></i>'; label = 'QGIS Documentation'; }
      else if (thematic.name === 'qgis_core') { icon = '<i class="fas fa-code mr-1"></i>'; label = 'QGIS Core'; }
      else if (thematic.name === 'web_sites') { icon = '<i class="fas fa-globe mr-1"></i>'; label = 'QGIS Web Sites'; }
      else if (thematic.name === 'community_activities') { icon = '<i class="fas fa-users mr-1"></i>'; label = 'Community'; }
      else if (thematic.name === 'qgis_infrastructure') { icon = '<i class="fas fa-server mr-1"></i>'; label = 'Infrastructure'; }
      
      badge.innerHTML = `<span>${icon}${label}</span><span class="contribution-count"><i class="fab fa-git-alt"></i>${thematic.count}</span>`;
      thematicsList.appendChild(badge);
    });
    
    // Hide supporting popup, show code popup
    document.getElementById('supporting-contributor-popup')?.classList.remove('active');
    this.activeContributorId = contributor.login;
    this.activeSupportingId = null;
    this.updateUrlState();
    popup.classList.add('active');
    document.getElementById('popup-overlay')?.classList.add('active');
  }

  showSupportingContributorPopup(props, event) {
    const popup = document.getElementById('supporting-contributor-popup');
    if (!popup) return;

    const isOrg = props.is_organization || false;
    const isActive = props.is_active !== false;

    // Avatar
    const avatarEl = document.getElementById('supporting-popup-avatar');
    avatarEl.src = props.avatar_img || '/img/default-avatar.png';
    avatarEl.style.borderRadius = isOrg ? '10%' : '50%';

    // Name / link
    const nameLink = document.getElementById('supporting-popup-name-link');
    const nameText = document.getElementById('supporting-popup-name-text');
    if (props.link) {
      nameLink.textContent = props.name;
      nameLink.href = props.link;
      nameLink.style.display = '';
      nameText.style.display = 'none';
    } else {
      nameText.textContent = props.name;
      nameText.style.display = '';
      nameLink.style.display = 'none';
    }

    // Status badge
    const statusEl = document.getElementById('supporting-popup-status');
    if (isActive) {
      statusEl.innerHTML = '<span class="tag is-success is-light is-small"><i class="fas fa-circle mr-1"></i>Active</span>';
    } else {
      statusEl.innerHTML = '<span class="tag is-light is-small has-text-grey"><i class="fas fa-circle mr-1"></i>Past contributor</span>';
    }

    // Date range
    const datesEl = document.getElementById('supporting-popup-dates');
    if (props.start_date || props.end_date) {
      const start = props.start_date ? new Date(props.start_date).getFullYear() : '?';
      const end = props.end_date ? new Date(props.end_date).getFullYear() : 'present';
      datesEl.innerHTML = `<i class="fas fa-calendar-alt mr-1"></i>${start} – ${end}`;
      datesEl.style.display = '';
    } else {
      datesEl.style.display = 'none';
    }

    // Description
    const descEl = document.getElementById('supporting-popup-description');
    if (props.contribution_description) {
      descEl.textContent = props.contribution_description;
      descEl.style.display = '';
    } else {
      descEl.style.display = 'none';
    }

    // Roles
    const rolesEl = document.getElementById('supporting-popup-roles');
    rolesEl.innerHTML = '';
    (props.roles || []).forEach(role => {
      const badge = document.createElement('span');
      badge.className = 'contributor-badge contributor-badge-community_activities';
      badge.innerHTML = `<span><i class="fas fa-award mr-1"></i>${role}</span>`;
      rolesEl.appendChild(badge);
    });

    // Hide code popup, show supporting popup
    document.getElementById('contributor-popup')?.classList.remove('active');
    this.activeSupportingId = props.name;
    this.activeContributorId = null;
    this.updateUrlState();
    popup.classList.add('active');
    document.getElementById('popup-overlay')?.classList.add('active');
  }
  
  closePopup() {
    document.getElementById('contributor-popup')?.classList.remove('active');
    document.getElementById('supporting-contributor-popup')?.classList.remove('active');
    document.getElementById('popup-overlay')?.classList.remove('active');
    this.activeContributorId = null;
    this.activeSupportingId = null;
    this.updateUrlState();
  }
  
  // ─── URL State ───────────────────────────────────────────────────────────────

  readUrlState() {
    const params = new URLSearchParams(window.location.search);

    const view = params.get('view');
    if (view === 'flat' || view === 'globe') {
      this.currentView = view;
      // Sync button active states immediately
      document.getElementById('globe-view-btn')?.classList.toggle('active', view === 'globe');
      document.getElementById('flat-view-btn')?.classList.toggle('active', view === 'flat');
    }

    if (params.has('showCode')) {
      this.showCodeContributors = params.get('showCode') !== 'false';
      const cb = document.getElementById('filter-code');
      if (cb) cb.checked = this.showCodeContributors;
    }

    if (params.has('showSupporting')) {
      this.showSupportingContributors = params.get('showSupporting') !== 'false';
      const cb = document.getElementById('filter-supporting');
      if (cb) cb.checked = this.showSupportingContributors;
    }

    this.activeContributorId = params.get('contributor') || null;
    this.activeSupportingId = params.get('supportingContributor') || null;
  }

  updateUrlState() {
    const params = new URLSearchParams(window.location.search);

    params.set('view', this.currentView);

    if (!this.showCodeContributors) {
      params.set('showCode', 'false');
    } else {
      params.delete('showCode');
    }

    if (!this.showSupportingContributors) {
      params.set('showSupporting', 'false');
    } else {
      params.delete('showSupporting');
    }

    if (this.activeContributorId) {
      params.set('contributor', this.activeContributorId);
      params.delete('supportingContributor');
    } else if (this.activeSupportingId) {
      params.set('supportingContributor', this.activeSupportingId);
      params.delete('contributor');
    } else {
      params.delete('contributor');
      params.delete('supportingContributor');
    }

    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    history.replaceState(null, '', newUrl);
  }

  _restorePopup() {
    if (this.activeContributorId) {
      const feature = this.contributorsData.features.find(
        f => f.properties.login === this.activeContributorId
      );
      if (feature) this.showContributorPopup(feature.properties, null);
    } else if (this.activeSupportingId) {
      const feature = this.supportingData.features.find(
        f => f.properties.name === this.activeSupportingId
      );
      if (feature) this.showSupportingContributorPopup(feature.properties, null);
    }
  }

  // ─── Rotation ────────────────────────────────────────────────────────────────

  startRotation() {
    if (this.isRotating || !this.globeMap) return;
    
    this.isRotating = true;
    const secondsPerRevolution = 30;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    
    const rotateCamera = (timestamp) => {
      if (!this.isRotating) return;
      
      const zoom = this.globeMap.getZoom();
      if (zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = this.globeMap.getCenter();
        center.lng -= distancePerSecond / 60;
        this.globeMap.easeTo({ center, duration: 1000 / 60, easing: (t) => t });
      }
      
      this.rotationAnimation = requestAnimationFrame(rotateCamera);
    };
    
    this.rotationAnimation = requestAnimationFrame(rotateCamera);
  }
  
  stopRotation() {
    this.isRotating = false;
    if (this.rotationAnimation) {
      cancelAnimationFrame(this.rotationAnimation);
      this.rotationAnimation = null;
    }
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function initContributorsMap() {
  if (typeof maplibregl === 'undefined') {
    console.error('MapLibre GL not loaded yet, retrying...');
    setTimeout(initContributorsMap, 100);
    return;
  }
  
  if (typeof ol === 'undefined') {
    console.error('OpenLayers not loaded yet, retrying...');
    setTimeout(initContributorsMap, 100);
    return;
  }
  
  const spinner = document.querySelector('.loading-spinner');

  Promise.all([
    fetch('/data/contributors/contributors_map.json').then(r => {
      if (!r.ok) throw new Error(`contributors_map.json: HTTP ${r.status}`);
      return r.json();
    }),
    fetch('/data/contributors/supporting_map.json').then(r => {
      if (!r.ok) {
        console.warn('supporting_map.json not found, skipping.');
        return { features: [] };
      }
      return r.json();
    })
  ])
    .then(([contributorsData, supportingData]) => {
      console.log(
        'Data loaded:',
        contributorsData.features.length, 'code contributors,',
        supportingData.features.length, 'supporting contributors'
      );
      new ContributorsMap(contributorsData, supportingData);
      if (spinner) spinner.style.display = 'none';
    })
    .catch(error => {
      console.error('Error loading contributors data:', error);
      if (spinner) {
        spinner.textContent = 'Error loading contributors data. Please try refreshing the page.';
        spinner.style.color = '#ee7913';
      }
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContributorsMap);
} else {
  initContributorsMap();
}

