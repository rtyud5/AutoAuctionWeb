export const ok = (data, message = "OK") => ({ success: true, message, data });
export const fail = (message = "Error", status = 400) => ({ success: false, message, status });
