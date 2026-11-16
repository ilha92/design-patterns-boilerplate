export interface ConfigurationApplication {
    readonly port: number;
}

function lirePort(value: string | undefined): number {
    const port = Number(value ?? 3000);

    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error("PORT doit être un entier compris entre 1 et 65535");
    }

    return port;
}

export function chargerConfiguration(env: NodeJS.ProcessEnv = process.env): ConfigurationApplication {
    return { port: lirePort(env.PORT) };
}
