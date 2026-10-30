const createRequest = async (options) => {
    const baseUrl = AMVERA_BACKEND_URL;
    const { url, method = 'GET', data } = options;

    const config = {
        method,
        headers: {},
    };

    const cleanUrl = url.startsWith('./') ? url.slice(1) : url;
    let finalUrl = `${baseUrl}${cleanUrl}`;

    if (method === "GET" && data) {
        const params = new URLSearchParams(data).toString();
        finalUrl += `?${params}`;
    } else if (data) {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(finalUrl, config);

        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Сетевая ошибка в createRequest:', error);
        throw error;
    }
};

export default createRequest;
