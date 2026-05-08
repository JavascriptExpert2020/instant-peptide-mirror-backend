const SHIPPO_API_BASE = "https://api.goshippo.com";

const pickString = (value) => (typeof value === "string" ? value.trim() : "");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCountryCode = (value) => {
  const raw = pickString(value).toUpperCase();
  if (!raw) {
    return "US";
  }

  if (raw.length === 2) {
    return raw;
  }

  const knownCountries = {
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    USA: "US",
    AMERICA: "US",
    CANADA: "CA",
    PAKISTAN: "PK",
    "UNITED KINGDOM": "GB",
    ENGLAND: "GB",
    SCOTLAND: "GB",
    WALES: "GB",
    "UAE": "AE",
  };

  return knownCountries[raw] || raw.slice(0, 2);
};

const normalizeAddressInput = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return {
    firstName: pickString(value.firstName),
    lastName: pickString(value.lastName),
    companyName: pickString(value.companyName || value.company),
    line1: pickString(value.line1 || value.address || value.address1 || value.street1),
    line2: pickString(value.line2 || value.apartment || value.address2 || value.street2),
    city: pickString(value.city),
    state: pickString(value.state),
    zip: pickString(value.zip || value.postalCode || value.postal),
    country: pickString(value.country) || "United States",
    phone: pickString(value.phone),
    email: pickString(value.email),
  };
};

const buildShippoAddress = (value, fallbackName = "") => {
  const address = normalizeAddressInput(value);
  if (!address) {
    return null;
  }

  const name = [address.firstName, address.lastName].filter(Boolean).join(" ") || pickString(fallbackName);
  const street1 = pickString(address.line1);
  const city = pickString(address.city);
  const state = pickString(address.state);
  const zip = pickString(address.zip);
  const country = normalizeCountryCode(address.country);

  if (!street1 || !city || !state || !zip || !country) {
    return null;
  }

  return {
    name: name || address.companyName || "Customer",
    company: address.companyName || name || "Customer",
    street1,
    street2: pickString(address.line2),
    city,
    state,
    zip,
    country,
    phone: pickString(address.phone),
    email: pickString(address.email),
    is_residential: true,
  };
};

const buildDefaultParcel = () => {
  const length = toNumber(process.env.SHIPPO_PARCEL_LENGTH, 10);
  const width = toNumber(process.env.SHIPPO_PARCEL_WIDTH, 8);
  const height = toNumber(process.env.SHIPPO_PARCEL_HEIGHT, 6);
  const weight = toNumber(process.env.SHIPPO_PARCEL_WEIGHT, 1);

  return {
    length: String(length),
    width: String(width),
    height: String(height),
    distance_unit: pickString(process.env.SHIPPO_PARCEL_DISTANCE_UNIT) || "in",
    weight: String(weight),
    mass_unit: pickString(process.env.SHIPPO_PARCEL_MASS_UNIT) || "lb",
  };
};

const buildOriginAddress = () => {
  const origin = buildShippoAddress(
    {
      firstName: process.env.SHIPPO_ORIGIN_FIRST_NAME || process.env.SHIPPO_ORIGIN_NAME,
      lastName: process.env.SHIPPO_ORIGIN_LAST_NAME,
      companyName: process.env.SHIPPO_ORIGIN_COMPANY || process.env.SHIPPO_ORIGIN_NAME,
      line1: process.env.SHIPPO_ORIGIN_STREET1,
      line2: process.env.SHIPPO_ORIGIN_STREET2,
      city: process.env.SHIPPO_ORIGIN_CITY,
      state: process.env.SHIPPO_ORIGIN_STATE,
      zip: process.env.SHIPPO_ORIGIN_ZIP,
      country: process.env.SHIPPO_ORIGIN_COUNTRY,
      phone: process.env.SHIPPO_ORIGIN_PHONE,
      email: process.env.SHIPPO_ORIGIN_EMAIL,
    },
    process.env.SHIPPO_ORIGIN_NAME || process.env.SHIPPO_ORIGIN_COMPANY || "Warehouse",
  );

  if (!origin) {
    return null;
  }

  if (!origin.company) {
    origin.company = origin.name;
  }

  return origin;
};

const safeJsonParse = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

const normalizeShippoRate = (rate) => {
  if (!rate || typeof rate !== "object") {
    return null;
  }

  const serviceLevel = rate.servicelevel && typeof rate.servicelevel === "object" ? rate.servicelevel : {};

  return {
    object_id: pickString(rate.object_id),
    amount: pickString(rate.amount),
    currency: pickString(rate.currency),
    provider: pickString(rate.provider),
    servicelevel_token: pickString(serviceLevel.token || rate.servicelevel_token),
    servicelevel_name: pickString(serviceLevel.name || rate.servicelevel_name),
    estimated_days:
      rate.estimated_days === null || rate.estimated_days === undefined
        ? undefined
        : toNumber(rate.estimated_days),
    duration_terms:
      rate.duration_terms === null || rate.duration_terms === undefined
        ? undefined
        : String(rate.duration_terms),
    test: Boolean(rate.test),
  };
};

const extractShippoError = (payload, status) => {
  if (!payload) {
    return `Shippo request failed with status ${status}.`;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (payload.detail) {
    return String(payload.detail);
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors
      .map((entry) => entry?.text || entry?.message || entry?.detail || JSON.stringify(entry))
      .filter(Boolean)
      .join("; ");
  }

  return `Shippo request failed with status ${status}.`;
};

const createShippoShipment = async ({
  orderNumber,
  customerName,
  customerEmail,
  shippingAddress,
}) => {
  const token = pickString(process.env.SHIPPO_API_KEY);
  if (!token) {
    throw new Error("Shippo API key is not configured.");
  }

  const addressFrom = buildOriginAddress();
  if (!addressFrom) {
    throw new Error("Shippo origin address is not configured.");
  }

  const addressTo = buildShippoAddress(shippingAddress, customerName);
  if (!addressTo) {
    throw new Error("Customer shipping address is incomplete.");
  }

  const payload = {
    address_from: addressFrom,
    address_to: {
      ...addressTo,
      email: addressTo.email || pickString(customerEmail),
    },
    parcels: [buildDefaultParcel()],
    async: false,
    metadata: pickString(orderNumber) ? `Order ${orderNumber}`.slice(0, 100) : undefined,
  };

  const response = await fetch(`${SHIPPO_API_BASE}/shipments/`, {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await safeJsonParse(response);
  if (!response.ok) {
    throw new Error(extractShippoError(data, response.status));
  }

  const rates = Array.isArray(data?.rates) ? data.rates : [];

  return {
    shipmentId: data?.object_id || null,
    status: data?.status || null,
    shipment: data,
    rates: rates
      .map(normalizeShippoRate)
      .filter(Boolean)
      .sort((a, b) => toNumber(a.amount) - toNumber(b.amount)),
  };
};

const quoteShippoRates = async ({ customerName, customerEmail, shippingAddress }) =>
  createShippoShipment({
    customerName,
    customerEmail,
    shippingAddress,
  });

module.exports = {
  createShippoShipment,
  quoteShippoRates,
  buildShippoAddress,
  normalizeAddressInput,
};
