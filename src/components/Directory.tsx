// import { IonButton, IonLoading } from "@ionic/react";
// import "./Directory.css";

// interface ContainerProps {}

// const Directory: React.FC<ContainerProps> = () => {

//   return (
//     <div id="container">
//       <IonButton id="open-loading">Show Loading</IonButton>
//       <IonLoading
//         trigger="open-loading"
//         message="Loading..."
//         duration={3000}
//         spinner="circles"
//       ></IonLoading>
//     </div>
//   );
// };

// export default Directory;

import React, { useEffect, useState } from "react";
import {
  IonSearchbar,
  IonList,
  IonItem,
  IonButton,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from "@ionic/react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import { Preferences } from "@capacitor/preferences";

interface DirectoryItem {
  address: string;
  name?: string;
  phone?: string;
  isContacted?: boolean;
  // ...other fields
}

const customIcon = L.icon({
  iconUrl: "/assets/leaflet/marker-icon-2x.png",
  iconSize: [32, 38],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const geoProvider = new OpenStreetMapProvider();
const PAGE_SIZE = 50;

interface ContainerProps {}

const Directory: React.FC<ContainerProps> = () => {
  const [directoryList, setDirectoryList] = useState<DirectoryItem[]>([]);
  const [filteredList, setFilteredList] = useState<DirectoryItem[]>([]);
  const [pagedList, setPagedList] = useState<DirectoryItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isListLoading, setIsListLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DirectoryItem | null>(null);
  const [selectedLatLng, setSelectedLatLng] = useState<[number, number] | null>(
    null
  );

  // Fetch data on mount
  useEffect(() => {
    fetch("/assets/data/cleaned_customers_trinidad_v3.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setDirectoryList(data);
        filterResults(data, searchText);
      })
      .catch((error) => {
        console.error("Error loading JSON:", error);
      });
    // eslint-disable-next-line
  }, []);

  // Update paged list when filteredList or currentPage changes
  useEffect(() => {
    setPagedList(
      filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    );
    setTotalPages(Math.ceil(filteredList.length / PAGE_SIZE));
  }, [filteredList, currentPage]);

  function InvalidateSize() {
    const map = useMap();
    useEffect(() => {
      setTimeout(() => {
        map.invalidateSize();
      }, 200); // slight delay ensures container is visible
    }, [map]);
    return null;
  }

  // Filter results
  const filterResults = (list: DirectoryItem[], search: string) => {
    const lowerSearch = search?.toLowerCase();
    const filtered = list.filter(
      (result) =>
        result.address &&
        typeof result.address === "string" &&
        result.address.toLowerCase().includes(lowerSearch)
    );
    setFilteredList(filtered);
    setCurrentPage(1);
    setTotalPages(Math.ceil(filtered.length / PAGE_SIZE));
    setIsListLoading(false);
  };

  // Handle search submit
  const onSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsListLoading(true);
    filterResults(directoryList, searchText);
  };

  // Geocode and show marker on map
  const onAddressClick = async (address: string, item: DirectoryItem) => {
    try {
      const results = await geoProvider.search({ query: address });
      if (results && results.length > 0) {
        const { x: lng, y: lat } = results[0];
        setSelectedLatLng([lat, lng]);
        setSelectedItem(item);
      } else {
        alert("Address not found!");
      }
    } catch (err) {
      alert("Geocoding error: " + err);
    }
  };

  // Pagination
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Infinite scroll (if needed)
  const loadData = (event: any) => {
    setCurrentPage((prev) => prev + 1);
    event.target.complete();
    if (pagedList.length >= filteredList.length) {
      event.target.disabled = true;
    }
  };

  return (
    <div>
      <form onSubmit={onSearchSubmit} style={{ padding: 8 }}>
        <IonSearchbar
          value={searchText}
          onIonChange={(e) => setSearchText(e.detail.value ?? "")}
          placeholder="Search address"
        />
        <IonButton type="submit" expand="block" disabled={isListLoading}>
          {isListLoading ? <IonSpinner name="dots" /> : "Search"}
        </IonButton>
      </form>
      <div style={{ height: "40vh", width: "100%", marginBottom: 16 }}>
        <MapContainer
          center={selectedLatLng || [10.6577911, -61.5155835]}
          zoom={selectedLatLng ? 16 : 13}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <InvalidateSize />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {selectedLatLng && (
            <Marker position={selectedLatLng} icon={customIcon}>
              <Popup>
                <strong>{selectedItem?.name || "Contact"}</strong>
                <br />
                {selectedItem?.address}
                <br />
                {selectedItem?.phone}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      <IonList>
        {pagedList.map((item, idx) => (
          <IonItem
            key={idx}
            button
            onClick={() => onAddressClick(item.address, item)}
          >
            <div>
              <div>
                <strong>{item.name}</strong>
              </div>
              <div>{item.address}</div>
              <div>{item.phone}</div>
              {item.isContacted && (
                <span style={{ color: "green" }}>Contacted</span>
              )}
              {/* Add your "Mark Contacted" button logic here if needed */}
            </div>
          </IonItem>
        ))}
      </IonList>
      <div style={{ display: "flex", justifyContent: "center", margin: 16 }}>
        <IonButton
          disabled={currentPage === 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          Prev
        </IonButton>
        <span style={{ margin: "0 8px", alignSelf: "center" }}>
          {currentPage} / {totalPages}
        </span>
        <IonButton
          disabled={currentPage === totalPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          Next
        </IonButton>
      </div>
      <IonInfiniteScroll
        onIonInfinite={(event) => {
          loadData(event);
          setTimeout(() => event.target.complete(), 500);
        }}
      >
        <IonInfiniteScrollContent></IonInfiniteScrollContent>
      </IonInfiniteScroll>
    </div>
  );
};

export default Directory;
