import { api } from "@/lib/api";
import {
  db,
  type CachedFoodLibraryRecord,
  type FoodLibraryEntry,
  type NutritionSnapshot,
  type OfflineFoodPayload,
  type OfflineFoodRecord,
} from "@/lib/db";

const OFFLINE_QUEUE_EVENT = "offline-food-queue-changed";
const OFFLINE_SYNC_EVENT = "offline-food-sync-complete";

const DEFAULT_TARGETS = {
  calories: 2500,
  protein: 180,
  carbs: 300,
  fats: 80,
};

const getStoredUser = (): { id?: string } | null => {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? (JSON.parse(storedUser) as { id?: string }) : null;
  } catch {
    return null;
  }
};

export const getStoredUserId = (): string | null => getStoredUser()?.id ?? null;

export const getTodayLocalISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createOfflineFoodId = () =>
  `offline:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

const sortFoodLibraryRecords = (foods: CachedFoodLibraryRecord[]) =>
  foods.sort((left, right) => {
    const leftDate = new Date(left.cachedAt || left.addedAt || 0).getTime();
    const rightDate = new Date(right.cachedAt || right.addedAt || 0).getTime();
    return rightDate - leftDate;
  });

const stripLibraryCacheFields = (food: CachedFoodLibraryRecord): FoodLibraryEntry => ({
  _id: food._id,
  name: food.name,
  unit: food.unit,
  calories: food.calories,
  protein: food.protein,
  carbs: food.carbs,
  fats: food.fats,
  servingSize: food.servingSize,
  externalId: food.externalId,
  addedAt: food.addedAt,
});

class SyncService {
  private isSyncing = false;

  private emitQueueChange() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
  }

  private emitSyncComplete(result: { syncedCount: number; failedCount: number }) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT, { detail: result }));
  }

  async addOfflineFood(payload: OfflineFoodPayload) {
    const userId = getStoredUserId();
    if (!userId) {
      throw new Error("Missing user session");
    }

    const localFoodId = payload.food.id || createOfflineFoodId();
    const record: OfflineFoodRecord = {
      ...payload,
      food: {
        ...payload.food,
        _id: undefined,
        id: localFoodId,
      },
      id: localFoodId,
      userId,
      diaryDate: getTodayLocalISO(),
      createdAt: new Date().toISOString(),
      synced: false,
      syncError: null,
    };

    await db.offlineFoods.put(record);

    if (payload.foodLibraryEntry) {
      await this.prependRecentFood(payload.foodLibraryEntry, userId);
    }

    this.emitQueueChange();

    if (typeof navigator !== "undefined" && navigator.onLine) {
      void this.syncOfflineFoods();
    }

    return record;
  }

  async removeOfflineFood(localFoodId: string) {
    const existing = await db.offlineFoods.get(localFoodId);
    if (!existing) return false;

    await db.offlineFoods.delete(localFoodId);
    this.emitQueueChange();
    return true;
  }

  async getPendingSyncCount(userId = getStoredUserId()) {
    if (!userId) return 0;

    const pendingFoods = await db.offlineFoods
      .where("userId")
      .equals(userId)
      .toArray();

    return pendingFoods.filter((food) => !food.synced).length;
  }

  async syncOfflineFoods() {
    if (this.isSyncing) {
      return { syncedCount: 0, failedCount: 0 };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const unsyncedFoods = (await db.offlineFoods.toArray())
        .filter((food) => !food.synced)
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

      for (const queuedFood of unsyncedFoods) {
        try {
          const { id, ...foodWithoutLocalId } = queuedFood.food;
          const requestPath = queuedFood.diaryDate === getTodayLocalISO()
            ? `/api/profile/${queuedFood.userId}/intake`
            : `/api/profile/${queuedFood.userId}/history/${queuedFood.diaryDate}/food`;

          await api.put(requestPath, {
            food: foodWithoutLocalId,
            calories: queuedFood.calories,
            protein: queuedFood.protein,
            carbs: queuedFood.carbs,
            fats: queuedFood.fats,
            foodLibraryEntry: queuedFood.foodLibraryEntry,
          });

          await db.offlineFoods.update(queuedFood.id, {
            synced: true,
            syncError: null,
          });
          syncedCount += 1;
        } catch (error) {
          failedCount += 1;
          await db.offlineFoods.update(queuedFood.id, {
            syncError: error instanceof Error ? error.message : "Failed to sync",
          });
        }
      }

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const oldSyncedFoods = (await db.offlineFoods.toArray()).filter(
        (food) => food.synced && new Date(food.createdAt).getTime() < sevenDaysAgo,
      );

      if (oldSyncedFoods.length > 0) {
        await db.offlineFoods.bulkDelete(oldSyncedFoods.map((food) => food.id));
      }

      this.emitQueueChange();
      this.emitSyncComplete({ syncedCount, failedCount });
      return { syncedCount, failedCount };
    } finally {
      this.isSyncing = false;
    }
  }

  async cacheRecentFoods(foods: FoodLibraryEntry[], userId = getStoredUserId()) {
    if (!userId) return;

    await db.recentFoods.where("userId").equals(userId).delete();

    if (foods.length === 0) {
      this.emitQueueChange();
      return;
    }

    const cachedAt = new Date().toISOString();
    await db.recentFoods.bulkAdd(
      foods.map((food) => ({
        ...food,
        userId,
        cachedAt,
      })),
    );
    this.emitQueueChange();
  }

  async cacheFavoriteFoods(foods: FoodLibraryEntry[], userId = getStoredUserId()) {
    if (!userId) return;

    await db.favoriteFoods.where("userId").equals(userId).delete();

    if (foods.length === 0) {
      this.emitQueueChange();
      return;
    }

    const cachedAt = new Date().toISOString();
    await db.favoriteFoods.bulkAdd(
      foods.map((food) => ({
        ...food,
        userId,
        cachedAt,
      })),
    );
    this.emitQueueChange();
  }

  async prependRecentFood(food: FoodLibraryEntry, userId = getStoredUserId()) {
    if (!userId) return;

    const existingFoods = await this.getCachedRecentFoods(userId);
    const normalizedName = food.name.trim().toLowerCase();
    const cachedAt = new Date().toISOString();

    const nextFoods = [
      {
        ...food,
        userId,
        cachedAt,
      },
      ...existingFoods
        .filter((entry) => entry.name.trim().toLowerCase() !== normalizedName)
        .map((entry) => ({
          ...entry,
          userId,
          cachedAt: entry.cachedAt || cachedAt,
        })),
    ].slice(0, 20);

    await db.recentFoods.where("userId").equals(userId).delete();
    if (nextFoods.length > 0) {
      await db.recentFoods.bulkAdd(nextFoods);
    }
    this.emitQueueChange();
  }

  async getCachedRecentFoods(userId = getStoredUserId()) {
    if (!userId) return [];

    const foods = await db.recentFoods.where("userId").equals(userId).toArray();
    return sortFoodLibraryRecords(foods).map(stripLibraryCacheFields);
  }

  async getCachedFavoriteFoods(userId = getStoredUserId()) {
    if (!userId) return [];

    const foods = await db.favoriteFoods.where("userId").equals(userId).toArray();
    return sortFoodLibraryRecords(foods).map(stripLibraryCacheFields);
  }

  async cacheTodaySnapshot(
    snapshot: Omit<NutritionSnapshot, "date" | "updatedAt" | "userId">,
    userId = getStoredUserId(),
  ) {
    if (!userId) return;

    await db.dailySnapshots.put({
      userId,
      date: getTodayLocalISO(),
      updatedAt: new Date().toISOString(),
      foods: snapshot.foods,
      intake: snapshot.intake,
      targets: snapshot.targets,
      dailyWater: snapshot.dailyWater,
      currentStreak: snapshot.currentStreak,
    });
  }

  async getTodaySnapshot(userId = getStoredUserId()) {
    if (!userId) return null;
    return db.dailySnapshots.get([userId, getTodayLocalISO()]);
  }

  async clearTodaySnapshot(userId = getStoredUserId()) {
    if (!userId) return;
    await db.dailySnapshots.delete([userId, getTodayLocalISO()]);
  }

  getDefaultTargets() {
    return DEFAULT_TARGETS;
  }

  getQueueChangedEventName() {
    return OFFLINE_QUEUE_EVENT;
  }

  getSyncCompletedEventName() {
    return OFFLINE_SYNC_EVENT;
  }
}

export const syncService = new SyncService();

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void syncService.syncOfflineFoods();
  });
}
