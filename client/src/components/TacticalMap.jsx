import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function TacticalMap({
  incidents = [],
  teams = [],
  gateways = [],
  selectedIncident = null,
  onSelectIncident = () => {},
  theme = 'light',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on San Francisco disaster simulation zone
    const map = L.map(mapContainerRef.current, {
      center: [37.7749, -122.4194],
      zoom: 14,
      zoomControl: true,
    });

    const initialTileUrl = themeRef.current === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(initialTileUrl, {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Ensure map tiles and dimensions calculate immediately after mount
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const onWindowResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onWindowResize);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update Tile Layer URL when theme changes
  useEffect(() => {
    if (!tileLayerRef.current) return;

    const targetTileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current.setUrl(targetTileUrl);
  }, [theme]);

  // Update Markers & Overlays when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. Plot Gateways (Radar Beacon icons)
    gateways.forEach((gw) => {
      if (!gw.location) return;

      const gwIcon = L.divIcon({
        className: 'custom-gw-marker',
        html: `
          <div style="
            background: #0284C7;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid #38BDF8;
            box-shadow: 0 0 12px #38BDF8;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
          ">
            📡
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([gw.location.latitude, gw.location.longitude], { icon: gwIcon });
      marker.bindTooltip(
        `<div style="font-family: sans-serif; font-size: 11px;">
          <strong>${gw.name}</strong><br/>
          Type: ${gw.backhaul_type}<br/>
          Battery: ${gw.battery_level}% | Status: ${gw.status}
        </div>`,
        { direction: 'top', offset: [0, -10] }
      );
      marker.addTo(markersLayer);
    });

    // 2. Plot Rescue Teams (Blue Tactical Shields)
    teams.forEach((team) => {
      if (!team.current_location) return;

      const isAssigned = team.status === 'ASSIGNED' || team.status === 'EN_ROUTE';
      const color = isAssigned ? '#10B981' : '#38BDF8';

      const teamIcon = L.divIcon({
        className: 'custom-team-marker',
        html: `
          <div style="
            background: ${color};
            color: #0F172A;
            font-weight: 800;
            font-size: 10px;
            padding: 4px 6px;
            border-radius: 4px;
            border: 1px solid white;
            box-shadow: 0 0 10px ${color};
            display: flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
          ">
            <span>🛡️</span> ${team.callsign}
          </div>
        `,
        iconSize: [60, 24],
        iconAnchor: [30, 12],
      });

      const marker = L.marker([team.current_location.latitude, team.current_location.longitude], { icon: teamIcon });
      marker.bindTooltip(
        `<div style="font-family: sans-serif; font-size: 11px;">
          <strong>${team.name}</strong> (${team.callsign})<br/>
          Status: <b>${team.status}</b> | Crew: ${team.personnel_count}<br/>
          Radio: ${team.radio_channel}
        </div>`,
        { direction: 'top', offset: [0, -10] }
      );
      marker.addTo(markersLayer);
    });

    // 3. Plot Incidents (Flame Category Markers + Uncertainty Circles)
    incidents.forEach((inc) => {
      const loc = inc.payload?.location;
      if (!loc || !loc.latitude || !loc.longitude) return;

      const isSelected = selectedIncident && selectedIncident.id === inc.id;
      const cat = inc.flame_evaluation?.category || 'LOW';
      const score = inc.flame_evaluation?.score || 0;

      let color = '#38BDF8';
      if (cat === 'CRITICAL') color = '#EF4444';
      else if (cat === 'HIGH') color = '#F97316';
      else if (cat === 'MEDIUM') color = '#FACC15';

      // Uncertainty Radius Circle (Section 10 & 14)
      const radiusMeters = loc.accuracy_meters || 50;
      const circle = L.circle([loc.latitude, loc.longitude], {
        radius: radiusMeters,
        color: color,
        weight: isSelected ? 2 : 1,
        opacity: isSelected ? 0.8 : 0.4,
        fillColor: color,
        fillOpacity: isSelected ? 0.2 : 0.08,
        dashArray: isSelected ? '4, 4' : null,
      });
      circle.addTo(markersLayer);

      // Icon
      const markerIcon = L.divIcon({
        className: 'custom-inc-marker',
        html: `
          <div style="
            background: ${color};
            width: ${isSelected ? '34px' : '28px'};
            height: ${isSelected ? '34px' : '28px'};
            border-radius: 50%;
            border: ${isSelected ? '3px solid #FFFFFF' : '2px solid rgba(255,255,255,0.8)'};
            box-shadow: 0 0 ${isSelected ? '20px' : '10px'} ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #000000;
            font-weight: 800;
            font-size: 11px;
            font-family: monospace;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            ${score}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: markerIcon });

      marker.on('click', () => {
        onSelectIncident(inc);
      });

      marker.bindTooltip(
        `<div style="font-family: sans-serif; font-size: 11px;">
          <b style="color: ${color};">${cat} (${score} pts)</b> - ${inc.payload?.emergency_type}<br/>
          People: ${inc.payload?.people_affected} | Injuries: ${inc.payload?.injuries}<br/>
          Status: <b>${inc.status}</b><br/>
          <i>${inc.payload?.landmark || 'GPS location'}</i>
        </div>`,
        { direction: 'top', offset: [0, -12] }
      );
      marker.addTo(markersLayer);

      // If selected and assigned team exists, draw line connecting them
      if (isSelected && inc.assigned_team?.current_location) {
        const teamLoc = inc.assigned_team.current_location;
        const routeLine = L.polyline(
          [
            [loc.latitude, loc.longitude],
            [teamLoc.latitude, teamLoc.longitude],
          ],
          {
            color: '#10B981',
            weight: 3,
            dashArray: '6, 6',
            opacity: 0.8,
          }
        );
        routeLine.addTo(markersLayer);
      }
    });

    // Pan to selected incident if updated
    if (selectedIncident?.payload?.location) {
      const loc = selectedIncident.payload.location;
      map.panTo([loc.latitude, loc.longitude], { animate: true, duration: 0.5 });
    }
  }, [incidents, teams, gateways, selectedIncident, onSelectIncident]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="map-toolbar">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }}></span> CRITICAL
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }}></span> HIGH
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FACC15' }}></span> MEDIUM
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8' }}></span> LOW
        </span>
        <span style={{ marginLeft: '0.5rem', color: '#64748B' }}>|</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>🛡️</span> Units
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>📡</span> Gateways
        </span>
      </div>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
