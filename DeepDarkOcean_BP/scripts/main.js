import { EntityEquippableComponent, EquipmentSlot, system, world } from "@minecraft/server";

const surfaceYByPlayer = new Map();

function isHeadInWater(player) {
    const head = player.getHeadLocation();
    const bx = Math.floor(head.x);
    const by = Math.floor(head.y);
    const bz = Math.floor(head.z);

    const block = player.dimension.getBlock({ x: bx, y: by, z: bz });
    if (!block) return false;

    return block.typeId === "minecraft:water" || block.typeId === "minecraft:flowing_water";
}

function findSurfaceYAbove(player) {
    const head = player.getHeadLocation();
    const bx = Math.floor(head.x);
    let y = Math.floor(head.y)
    const bz = Math.floor(head.z);

    const worldMax = 320;
    for (let scanY = y; scanY <= worldMax; scanY++) {
        const block = player.dimension.getBlock({ x: bx, y: scanY, z: bz });
        if (!block) return scanY;
        if (block.typeId !== "minecraft:water" && block.typeId !== "minecraft:flowing_water") {
            return scanY;
        }
    }
    return y;
}

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const headInWater = isHeadInWater(player);

        if (!headInWater) {
            player.onScreenDisplay.setActionBar("");
            surfaceYByPlayer.delete(player.id);
            continue;
        }

        if (!surfaceYByPlayer.has(player.id)) {
            const surfaceY = findSurfaceYAbove(player);
            surfaceYByPlayer.set(player.id, surfaceY);
        }

        const surfaceY = surfaceYByPlayer.get(player.id);
        const headY = player.getHeadLocation().y;
        const depth = Math.max(0, surfaceY - headY);
        const pressure = (1 + depth / 10).toFixed(2);

        let message = `§eDepth: ${depth.toFixed(1)}m §7| §ePressure: ${pressure} atm`;

        const eq = player.getComponent(EntityEquippableComponent.componentId);

        const hasArmor =
            !!eq.getEquipment(EquipmentSlot.Head) ||
            !!eq.getEquipment(EquipmentSlot.Chest) ||
            !!eq.getEquipment(EquipmentSlot.Legs) ||
            !!eq.getEquipment(EquipmentSlot.Feet);

        if (pressure >= 8 && pressure < 10) {
            if (hasArmor) message += ` §cSuit will break soon!`;
            else message += ` §cHigh Pressure!`;
        }

        if (pressure >= 10) {
            if (hasArmor) {
                const slots = [
                    EquipmentSlot.Head,
                    EquipmentSlot.Chest,
                    EquipmentSlot.Legs,
                    EquipmentSlot.Feet
                ];
                let brokeSomething = false;
                for (const s of slots) {
                    const item = eq.getEquipment(s);
                    if (item) {
                        eq.setEquipment(s, undefined);
                        brokeSomething = true;
                    }
                }
                if (brokeSomething) {
                    message += ` §4§lSUIT BROKEN! Ascend immediately!`;
                    player.playSound("random.break");
                } else {
                    message += ` §4Danger! Extreme pressure!`;
                }
            } else {
                message += ` §4Danger! Extreme pressure!`;
            }
        }

        player.onScreenDisplay.setActionBar(message);

        const chestItem = eq.getEquipment(EquipmentSlot.Chest);
        if (chestItem?.typeId === "dd:oxygen_tank") {
            //todo: show oxygen UI / reduce tank charges etc.
        }
    }
});

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const eyeLoc = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        const particlePos = {
            x: eyeLoc.x + viewDir.x * 0.25,
            y: eyeLoc.y - 0.02,
            z: eyeLoc.z + viewDir.z * 0.25
        };
        player.dimension.spawnParticle("minecraft:basic_bubble_particle", particlePos);
    }
}, 40);

//function getRandomInt(min, max) {
//    min = Math.ceil(min);
//    max = Math.floor(max);
//    return Math.floor(Math.random() * (max - min + 1)) + min;
//}