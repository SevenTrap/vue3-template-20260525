import * as mars3d from "mars3d";
import dayjs from "dayjs";

export function formatLocalTime2UTC(localTime, offset = 8) {
  return dayjs(localTime).subtract(offset, "hour").toDate();
}
