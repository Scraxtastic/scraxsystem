import { cpuCurrentSpeed, cpuTemperature, currentLoad, mem, networkStats } from "systeminformation";
import { BasicData } from "../models/BasicData";
import { toFixedAsFloat } from "./toFixedAsFloat";

export const getData = async (name: string, availableMods: {}) => {
    let data: BasicData = {
      name: name,
      latency: { value: -1, unit: "s" },
      ram: { used: -1, total: -1, unit: "GB" },
    };
    data.cpuSpeed = { value: toFixedAsFloat((await cpuCurrentSpeed()).avg, 1), unit: "GHz" };
    if (data.cpuSpeed.value === null) {
      delete data.cpuSpeed;
    }
  
    const cpuTemp = (await cpuTemperature()).main;
    data.cpuTemp = { value: toFixedAsFloat(cpuTemp, 1), unit: "°C" };
    if (data.cpuTemp.value === null) {
      delete data.cpuTemp;
    }
  
    data.cpuLoad = { value: toFixedAsFloat((await currentLoad()).avgLoad * 100, 1), unit: "%" };
    if (data.cpuLoad.value === null || data.cpuLoad.value === 0) {
      delete data.cpuLoad;
    }
    data.latency = { value: toFixedAsFloat((await networkStats())[0].ms / 1000, 1), unit: "s" };
    const memData = await mem();
    const gb = Math.pow(10, 9);
    const mb = Math.pow(10, 6);
    let unit = gb;
    let unitName = "GB";
    if (memData.total < gb) {
      unit = mb;
      unitName = "MB";
    }
    data.ram = {
      used: toFixedAsFloat(memData.active / unit, 1),
      total: toFixedAsFloat((memData.active + memData.available) / unit, 1),
      unit: unitName,
    };
  
    // MODS
    data.mods = Object.keys(availableMods).map((key) => {
      return { name: key };
    });
    return JSON.stringify(data);
  };