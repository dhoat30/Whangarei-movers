"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./LocationsCovered.module.scss";
import Container from "@mui/material/Container";
import { Chip, Typography } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";

const DEFAULT_CENTER = [-35.7251, 174.3237];
const DEFAULT_ZOOM = 10;
const MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

const LOCATION_COORDINATES = {
  Whangarei: [-35.7251, 174.3237],
  "Whangārei": [-35.7251, 174.3237],
  "Whangarei Central": [-35.7251, 174.3237],
  "Whangarei CBD": [-35.7251, 174.3237],
  Riverside: [-35.7227, 174.3305],
  Morningside: [-35.7367, 174.3149],
  Kensington: [-35.7107, 174.315],
  Regent: [-35.7161, 174.322],
  Woodhill: [-35.7191, 174.3045],
  Mairtown: [-35.7077, 174.3249],
  Horahora: [-35.7342, 174.3023],
  Raumanga: [-35.7463, 174.297],
  Maunu: [-35.7478, 174.2793],
  Kamo: [-35.6828, 174.3084],
  "Te Kamo": [-35.6828, 174.3084],
  Tikipunga: [-35.6889, 174.3304],
  Otangarei: [-35.7014, 174.3222],
  Onerahi: [-35.7695, 174.3664],
  "Port Whangarei": [-35.7528, 174.3456],
  "Springs Flat": [-35.6672, 174.309],
  Hikurangi: [-35.5966, 174.2874],
  Tutukaka: [-35.6154, 174.5249],
  Ngunguru: [-35.6274, 174.499],
  "Parua Bay": [-35.7678, 174.4531],
  "Whangarei Heads": [-35.816, 174.5065],
  Maungatapere: [-35.7517, 174.2054],
  Ruakaka: [-35.9086, 174.4508],
  Waipu: [-35.9865, 174.4472],
};

const NORMALIZED_LOCATION_COORDINATES = Object.entries(LOCATION_COORDINATES).reduce(
  (acc, [label, coordinates]) => {
    acc[normalizeLocationLabel(label)] = coordinates;
    return acc;
  },
  {}
);

function normalizeLocationLabel(label = "") {
  return String(label)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getLocationCoordinates(label) {
  const normalizedLabel = normalizeLocationLabel(label);

  return (
    LOCATION_COORDINATES[label] ||
    NORMALIZED_LOCATION_COORDINATES[normalizedLabel] ||
    (normalizedLabel.includes("whangarei")
      ? LOCATION_COORDINATES.Whangarei
      : null)
  );
}

function getLocationLabel(location) {
  if (typeof location === "string") return location;
  return location?.label || location?.location || location?.title || "";
}

function stripHtml(html = "") {
  return String(html).replace(/<[^>]*>/g, "").trim();
}

export default function LocationsCovered({
  title,
  description,
  locations,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [activeLocation, setActiveLocation] = useState("");
  const [mapError, setMapError] = useState("");

  const locationLabels = useMemo(() => {
    const labels = (locations || [])
      .map(getLocationLabel)
      .map((label) => label.trim())
      .filter(Boolean);

    return [...new Set(labels)];
  }, [locations]);

  const titleText = stripHtml(title);
  const hasHtmlTitle = typeof title === "string" && /<\/?[a-z][\s\S]*>/i.test(title);
  const hasHtmlDescription =
    typeof description === "string" && /<\/?[a-z][\s\S]*>/i.test(description);

  useEffect(() => {
    let cancelled = false;
    let map;

    async function initMap() {
      try {
        const leaflet = await import("leaflet");
        if (cancelled || !mapRef.current) return;

        map = leaflet.map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        leaflet
          .tileLayer(MAP_TILE_URL, {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
          })
          .addTo(map);

        const markerIcon = leaflet.divIcon({
          className: styles.marker,
          html: "<span></span>",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        mapInstanceRef.current = map;

        if (!locationLabels.length) return;

        const nextMarkers = [];
        const bounds = [];

        locationLabels.forEach((label) => {
          const coordinates = getLocationCoordinates(label);
          if (!coordinates) return;

          const marker = leaflet
            .marker(coordinates, {
              icon: markerIcon,
              title: label,
            })
            .addTo(map)
            .bindPopup(label);

          marker.on("click", () => {
            setActiveLocation(label);
            map.flyTo(coordinates, 13, { duration: 0.55 });
          });

          bounds.push(coordinates);
          nextMarkers.push(marker);
        });

        markersRef.current = nextMarkers;

        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [36, 36] });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 13);
        }
      } catch {
        setMapError("Map failed to load.");
      }
    }

    initMap();

    return () => {
      cancelled = true;
      markersRef.current = [];
      if (map) {
        map.remove();
      }
    };
  }, [locationLabels]);

  const handleLocationClick = (label) => {
    setActiveLocation(label);
    const marker = markersRef.current.find(
      (item) => item.options?.title === label
    );
    const map = mapInstanceRef.current;

    if (!marker || !map) return;

    map.flyTo(marker.getLatLng(), 13, { duration: 0.55 });
    marker.openPopup();
  };

  return (
    <section className={`${styles.section}`} id="locations-covered">
      <Container maxWidth="lg" className={styles.container}>
        <div className={`${styles.contentWrapper}`}>
          {hasHtmlTitle ? (
            <div
              className={`${styles.title} heading-2 `}
              dangerouslySetInnerHTML={{ __html: title }}
            />
          ) : (
            <Typography variant="h3" component="h2" className={styles.title}>
              {title}
            </Typography>
          )}

          {hasHtmlDescription ? (
            <div
              className={`body1 mt-16`}
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <Typography
              variant="body1"
              component="p"
              className={`${styles.description} mt-16`}
            >
              {description}
            </Typography>
          )}

          <ul className={`${styles.locationsWrapper} mt-16`}>
            {locationLabels.map((label) => (
              <li key={label}>
                <Chip
                  icon={<LocationOnIcon fontSize="small" />}
                  label={label}
                  onClick={() => handleLocationClick(label)}
                  className={`${styles.locationChip} ${
                    activeLocation === label ? styles.active : ""
                  }`}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.mapPanel}>
          <div
            ref={mapRef}
            className={styles.map}
            aria-label={`${titleText || "Areas covered"} map`}
          />
          {mapError && (
            <Typography variant="body2" className={styles.mapError}>
              {mapError}
            </Typography>
          )}
        </div>
      </Container>
    </section>
  );
}
