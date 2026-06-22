import SatelliteClass from "@/models/SatelliteClass";
export async function initSatellitesTree() {
  const res = await fetch("./data/active_satellites.txt");
  const text = await res.text();
  let lines = text.split("\n");
  let satelliteModels = new Map();

  let satellitesTree = [
    {
      id: "root",
      label: "卫星列表",
      children: [
        {
          id: "LEO",
          label: "低轨卫星",
          children: [],
        },
        {
          id: "MEO",
          label: "中轨卫星",
          children: [],
        },
        {
          id: "GEO",
          label: "地球同步轨道",
          children: [],
        },
        {
          id: "HEO",
          label: "大椭圆轨道",
          children: [],
        },
      ],
    },
  ];

  for (let i = 0; i < lines.length; i += 3) {
    try {
      const name = lines[i].trim();
      const tle1 = lines[i + 1].trim();
      const tle2 = lines[i + 2].trim();

      const satelliteModel = new SatelliteClass(tle1, tle2, name);
      satelliteModels.set(satelliteModel.noradID, satelliteModel);

      if (satelliteModel.eccentricity > 0.05) {
        // 大椭圆轨道卫星
        satellitesTree[0].children[3].children.push({
          id: satelliteModel.noradID,
          label: satelliteModel.name,
          type: "HEO",
          model: satelliteModel,
        });

        continue;
      }

      if (satelliteModel.a <= 8500) {
        // 低轨卫星
        satellitesTree[0].children[0].children.push({
          id: satelliteModel.noradID,
          label: satelliteModel.name,
          type: "LEO",
          model: satelliteModel,
        });
      } else if (satelliteModel.a < 36000) {
        // 中轨卫星
        satellitesTree[0].children[1].children.push({
          id: satelliteModel.noradID,
          label: satelliteModel.name,
          type: "MEO",
          model: satelliteModel,
        });
      } else {
        // 高轨卫星
        satellitesTree[0].children[2].children.push({
          id: satelliteModel.noradID,
          label: satelliteModel.name,
          type: "GEO",
          model: satelliteModel,
        });
      }
    } catch (error) {
      console.log(lines[i], lines[i + 1], lines[i + 2]);
      console.log(error);
    }
  }

  satellitesTree[0].children[0].label += ` (${satellitesTree[0].children[0].children.length})`;
  satellitesTree[0].children[1].label += ` (${satellitesTree[0].children[1].children.length})`;
  satellitesTree[0].children[2].label += ` (${satellitesTree[0].children[2].children.length})`;
  satellitesTree[0].children[3].label += ` (${satellitesTree[0].children[3].children.length})`;

  return { satellitesTree, satelliteModels };
}
