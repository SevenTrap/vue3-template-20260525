export const earthRadiusKm = 6378.135; // 地球平均半径（km）
export const earthRadiusM = earthRadiusKm * 1000; // 地球平均半径（m）
export const mu = 398600.8; // 地球引力常数 [km^3/s^2]

export const earthFlattening = 1 / 298.257223563; // 地球扁率
export const earthEccentricitySquared = 2 * earthFlattening - earthFlattening * earthFlattening; // 地球偏心率平方
