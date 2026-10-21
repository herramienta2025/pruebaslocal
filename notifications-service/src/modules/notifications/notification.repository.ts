import { randomUUID } from 'node:crypto';
import { Notification } from './notification.model.js';

/**
 * Repositorio en memoria de notificaciones (scaffold).
 * Reemplazable por una base de datos sin modificar el servicio ni el controlador.
 */
const store: Notification[] = [];

export class NotificationRepository {
  static async create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notification: Notification = {
      ...data,
      id: `notif_${randomUUID()}`,
      createdAt: new Date().toISOString()
    };
    store.push(notification);
    return notification;
  }

  static async findByUser(
    userId: string,
    options?: { unreadOnly?: boolean; category?: string }
  ): Promise<Notification[]> {
    return store
      .filter((n) => {
        if (n.userId !== userId) return false;
        if (options?.unreadOnly && n.read) return false;
        if (options?.category && n.category !== options.category) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static async findById(id: string): Promise<Notification | undefined> {
    return store.find((n) => n.id === id);
  }

  static async markAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const notification = store.find((n) => n.id === id && n.userId === userId);
    if (!notification) return undefined;
    notification.read = true;
    return notification;
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const index = store.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) return false;
    store.splice(index, 1);
    return true;
  }

  static async clear(): Promise<void> {
    store.length = 0;
  }
}
