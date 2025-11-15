import React, { useState } from "react";
import Papa from "papaparse";
import {
  IonButton,
  IonInput,
  IonList,
  IonItem,
  IonLabel,
  IonBackdrop,
} from "@ionic/react";
import { Preferences } from "@capacitor/preferences";

interface ToggleMenu {
  showCsvModal: boolean;
  setShowCsvModal: (showCsvModal: boolean) => void;
}

type TransformedItem = {
  name: string;
  address: string;
  phone: string;
  occupation: string | null;
  customer_type: string | null;
};

const CsvToJson: React.FC<ToggleMenu> = ({ showCsvModal, setShowCsvModal }) => {
  const [jsonData, setJsonData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>("");

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setJsonData(results.data as any[]);
        },
        error: (err: any) => {
          alert("Error parsing CSV: " + err.message);
        },
      });
    };
    reader.readAsText(file);
  };

  const transformData = (data: any): TransformedItem[] => {
    // First, transform and filter as before
    const transformed = data
      .map((item: any) => {
        const transformed: TransformedItem = {
          name: item[""]?.trim() || "",
          address: item["_1"]?.trim() || "",
          phone: item["_2"]?.trim() || "",
          occupation: item["_3"]?.trim() || null,
          customer_type: item["_4"]?.trim() || null,
        };
        if (!transformed.occupation) transformed.occupation = null;
        if (!transformed.customer_type) transformed.customer_type = null;
        return transformed;
      })
      .filter(
        (item: TransformedItem) => item.name !== "" && item.address !== ""
      );

    // Remove duplicates by phone using a Map with explicit typing
    const uniqueByPhoneMap = new Map<string, TransformedItem>();
    for (const item of transformed) {
      if (!uniqueByPhoneMap.has(item.phone)) {
        uniqueByPhoneMap.set(item.phone, item);
      }
    }

    // Convert Map values to array with correct type
    const uniqueByPhone = Array.from(uniqueByPhoneMap.values());

    return uniqueByPhone;
  };

  const storeNewDirectoryListing = async (directoryData: any) => {
    await Preferences.set({
      key: "CCDLdirectory",
      value: JSON.stringify(directoryData),
    });
  };

  const getNewDirectoryListing = async () => {
    const { value } = await Preferences.get({ key: "CCDLdirectory" });
    if (value) {
      return JSON.parse(value);
    }
    return null;
  };

  const updateDirectoryData = () => {
    const transformeedData = transformData(jsonData);
    storeNewDirectoryListing(transformeedData);
    console.log("data", transformeedData);
  };

  return (
    <>
      <IonBackdrop visible={true}></IonBackdrop>
      <div className="popup-dialog dialog-container" style={{ padding: 16 }}>
        <h2>Add/Edit List</h2>
        <IonButton>
          <label htmlFor="csvInput" style={{ cursor: "pointer" }}>
            Select CSV File
          </label>
        </IonButton>
        <input
          id="csvInput"
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        {fileName && <p>Selected file: {fileName}</p>}
        <IonList>
          {jsonData.map((row, idx) => (
            <IonItem key={idx}>
              <IonLabel>
                <pre>{JSON.stringify(row, null, 2)}</pre>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
        <IonItem>
          <IonButton
            fill="outline"
            slot="end"
            onClick={() => setShowCsvModal(false)}
          >
            Cancel
          </IonButton>
          <IonButton
            onClick={() => updateDirectoryData()}
            slot="end"
            expand="block"
          >
            Continue
          </IonButton>
        </IonItem>
      </div>
    </>
  );
};

export default CsvToJson;
