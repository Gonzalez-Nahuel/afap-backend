import crypto from "crypto";

export const generateOTP = () => {
  const buffer = crypto.randomBytes(4);
  const number = (buffer.readUInt32BE(0) % 900000) + 100000;
  return number.toString();
};
