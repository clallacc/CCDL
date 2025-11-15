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
import "./Directory.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import { Preferences } from "@capacitor/preferences";
import CsvToJson from "./Csvtojson";

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

// Electron detection with TypeScript-safe access to process.type
const isElectron =
  typeof window !== "undefined" &&
  typeof (window as any).process === "object" &&
  (window as any).process &&
  (window as any).process.type === "renderer";

let ipcRenderer: any = null;
if (isElectron) {
  // @ts-ignore
  ipcRenderer = (window as any).require("electron").ipcRenderer;
}

// Declare the type for the exposed API on window
declare global {
  interface Window {
    electronAPI?: {
      onShowCsvToJson: (callback: () => void) => () => void;
    };
  }
}

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
  const [contactedList, setContactedList] = useState<any[]>([]);
  const [listFloating, setListFloating] = useState(false);

  const [showCsvModal, setShowCsvModal] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) {
      console.log("electronAPI not available");
      return;
    }
    const removeListener = window.electronAPI.onShowCsvToJson(() => {
      setShowCsvModal(true);
    });
    return () => {
      removeListener();
    };
  }, []);

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to get stored data
        const { value } = await Preferences.get({ key: "CCDLdirectory" });
        if (value) {
          const storedData = JSON.parse(value);
          setDirectoryList(storedData);
          filterResults(storedData, searchText);
        } else {
          // If no stored data, fetch from JSON file
          const res = await fetch(
            "/assets/data/cleaned_customers_trinidad_v3.json"
          );
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          const data = await res.json();
          setDirectoryList(data);
          filterResults(data, searchText);
        }
      } catch (error) {
        alert(`Error loading directory data: ${error}`);
        console.error("Error loading directory data:", error);
      }
    };

    loadData();
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

  useEffect(() => {
    const loadContacted = async () => {
      const list = (await getDirectoryListingContacted()) || [];
      setContactedList(list);
    };
    loadContacted();
  }, []);

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
    setSelectedLatLng(null);
    setSelectedItem(null);

    setTimeout(async () => {
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
    }, 0);
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

  const getDirectoryListingContacted = async () => {
    const { value } = await Preferences.get({ key: "CCDLcontacted" });
    if (value) {
      return JSON.parse(value);
    }
    return null;
  };

  const setDirectoryListingContacted = async (directoryData: any) => {
    await Preferences.set({
      key: "CCDLcontacted",
      value: JSON.stringify(directoryData),
    });
  };

  const markCompleted = async (address: string, phone: string) => {
    const listing = contactedList || [];
    const exists = listing.some(
      (item) => item.address === address && item.phone === phone
    );

    if (!exists) {
      const contacted = { address, phone };
      const newListing = [...listing, contacted];
      await setDirectoryListingContacted(newListing);
      setContactedList(newListing); // update state to re-render UI
    }
  };

  const disableListField = (address: string, phone: string) => {
    return contactedList.some(
      (item) => item.address === address && item.phone === phone
    );
  };

  const expandContractList = () => {
    if (listFloating) {
      setListFloating(false);
    } else {
      setListFloating(true);
    }
  };

  return (
    <>
      <div className="mapContainer">
        <form
          className="search-form"
          onSubmit={onSearchSubmit}
          style={{ padding: 8 }}
        >
          <IonSearchbar
            value={searchText}
            onIonChange={(e) => setSearchText(e.detail.value ?? "")}
            placeholder="Search address"
          />
          <IonButton
            type="submit"
            expand="block"
            shape="round"
            className="ion-margin-start ion-margin-end"
            disabled={isListLoading}
          >
            {isListLoading ? <IonSpinner name="dots" /> : "Search"}
          </IonButton>
        </form>
        <div
          style={{
            height: listFloating ? "90vh" : "40vh",
            width: "100%",
            marginBottom: 16,
          }}
        >
          <MapContainer
            center={selectedLatLng || [10.6577911, -61.5155835]}
            zoom={selectedLatLng ? 18 : 13}
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
          <div className="menu-div">
            <IonButton onClick={() => setShowCsvModal(true)} fill="clear">
              menu
            </IonButton>
          </div>
          <div
            className="directory-pager"
            style={{ display: "flex", justifyContent: "center", margin: 16 }}
          >
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
        </div>
        <IonList className={listFloating ? "floating-list" : ""}>
          <div className="expand-btn">
            <IonButton onClick={() => expandContractList()} fill="clear">
              {listFloating ? "expand" : "contract"}
            </IonButton>
          </div>

          {pagedList.map((item, idx) => (
            <IonItem
              className="list-item"
              key={idx}
              button
              onClick={() => onAddressClick(item.address, item)}
            >
              <div>
                <div>
                  <strong>{item.name}</strong>
                </div>
                <div>{item.address}</div>
              </div>
              <IonButton fill="clear" slot="end">
                <h3>{item.phone}</h3>
              </IonButton>
              {item.phone && !disableListField(item.address, item.phone) && (
                <IonButton
                  onClick={() => markCompleted(item.address, item.phone || "")}
                  slot="end"
                  color={"danger"}
                >
                  <span style={{ color: "white" }}>Contacted</span>
                </IonButton>
              )}
            </IonItem>
          ))}
        </IonList>
        <IonInfiniteScroll
          onIonInfinite={(event) => {
            loadData(event);
            setTimeout(() => event.target.complete(), 500);
          }}
        >
          <IonInfiniteScrollContent></IonInfiniteScrollContent>
        </IonInfiniteScroll>
      </div>

      {/* Show CsvToJson modal when triggered from Electron menu */}
      {showCsvModal && (
        <CsvToJson
          showCsvModal={showCsvModal}
          setShowCsvModal={setShowCsvModal}
        />
      )}
    </>
  );
};

export default Directory;
