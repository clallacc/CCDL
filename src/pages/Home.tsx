import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import Directory from "../components/Directory";
import "./Home.css";

const Home: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Computers and Controls Directory Lookup</IonTitle>
        </IonToolbar>
        {/* <div id="mapId"></div> */}
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Directory Lookup</IonTitle>
          </IonToolbar>
        </IonHeader>
        <Directory />
      </IonContent>
    </IonPage>
  );
};

export default Home;
