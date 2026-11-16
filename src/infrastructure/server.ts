import { creerApplication } from "./app";
import { chargerConfiguration } from "./config";

const { port } = chargerConfiguration();
const serveur = creerApplication().listen(port, () => {
    console.log(`Serveur HTTP en écoute sur le port ${port}`);
});

function arreterServeur(signal: string): void {
    console.log(`${signal} reçu, arrêt du serveur`);

    serveur.close((erreur) => {
        if (erreur !== undefined) {
            console.error("Échec de l'arrêt du serveur HTTP", erreur);
            process.exitCode = 1;
        }
    });
}

process.once("SIGINT", () => arreterServeur("SIGINT"));
process.once("SIGTERM", () => arreterServeur("SIGTERM"));
