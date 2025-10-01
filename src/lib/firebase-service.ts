import { database } from './firebase';
import type { Database } from 'firebase/database';
import {
  ref,
  get,
  set,
  update,
  push,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
  remove,
} from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

export interface RoomInvitation {
  id: string;
  roomId: string;
  roomName: string;
  senderName: string;
  timestamp: number;
  read?: boolean;
}

export interface FriendRequest {
  id: string;
  senderName: string;
  timestamp: number;
  read?: boolean;
}

export interface AppUser {
  name: string;
  avatarId?: string;
  friends?: { [key: string]: boolean }; // Using object for easier add/remove
  friendRequests?: { [key: string]: FriendRequest };
  invitations?: { [key: string]: RoomInvitation };
  generatedAvatars?: { id: string; imageUrl: string; description: string; imageHint: string }[];
}


export type AppNotification = {
    id: string;
    type: 'friendRequest' | 'roomInvitation';
    title: string;
    body: string;
    senderName: string;
    roomId?: string;
    timestamp: number;
    read?: boolean;
}

const getUsersRef = (db: Database) => ref(db, 'users');
const getUserRef = (db: Database, username: string) => ref(db, `users/${username}`);

export const getUserData = async (username: string): Promise<AppUser | null> => {
  const userRef = getUserRef(database, username);
  const snapshot = await get(userRef);
  return snapshot.exists() ? snapshot.val() : null;
};

export const upsertUser = async (user: { name: string, avatarId?: string, newAvatar?: any }) => {
  const userRef = getUserRef(database, user.name);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    await set(userRef, {
      name: user.name,
      avatarId: user.avatarId || 'avatar1',
      generatedAvatars: user.newAvatar ? [user.newAvatar] : []
    });
  } else {
    const updates: any = {};
    if (user.avatarId) {
      updates.avatarId = user.avatarId;
    }
    if (user.newAvatar) {
        const existingAvatars = snapshot.val().generatedAvatars || [];
        updates.generatedAvatars = [...existingAvatars, user.newAvatar];
    }
    if (Object.keys(updates).length > 0) {
      await update(userRef, updates);
    }
  }
};

export const searchUsers = async (nameQuery: string, currentUsername: string): Promise<AppUser[]> => {
    const usersRef = getUsersRef(database);
    const usersQuery = query(usersRef, orderByChild('name'), equalTo(nameQuery));
    const snapshot = await get(usersQuery);
    
    const users: AppUser[] = [];
    if (!snapshot.exists()) {
        return [];
    }

    const currentUserData = await getUserData(currentUsername);
    if (!currentUserData) return [];

    const friendNames = new Set(Object.keys(currentUserData.friends || {}));
    const receivedRequests = new Set(Object.values(currentUserData.friendRequests || {}).map(req => req.senderName));
    
    snapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val() as AppUser;
        if (userData.name !== currentUsername && !friendNames.has(userData.name) && !receivedRequests.has(userData.name)) {
            users.push(userData);
        }
    });

    return users;
};

export const sendFriendRequest = async (senderName: string, recipientName: string) => {
    const recipientData = await getUserData(recipientName);

    if (!recipientData) throw new Error('المستخدم الذي تحاول إضافته غير موجود.');
    if (recipientData.friendRequests && Object.values(recipientData.friendRequests).some(req => req.senderName === senderName)) {
        throw new Error('لقد أرسلت طلب صداقة لهذا المستخدم بالفعل.');
    }
    if (recipientData.friends && recipientData.friends[senderName]) {
        throw new Error('هذا المستخدم صديقك بالفعل.');
    }

    const recipientRequestsRef = ref(database, `users/${recipientName}/friendRequests`);
    const newRequestRef = push(recipientRequestsRef);
    const newRequest: FriendRequest = {
        id: newRequestRef.key!,
        senderName,
        timestamp: Date.now(),
        read: false,
    };
    await set(newRequestRef, newRequest);
};

export const acceptFriendRequest = async (senderName: string, recipientName: string) => {
    const recipientData = await getUserData(recipientName);
    if (!recipientData || !recipientData.friendRequests) return;

    const reqKey = Object.keys(recipientData.friendRequests).find(
        key => recipientData.friendRequests![key].senderName === senderName
    );

    if (!reqKey) return;

    const updates: { [key: string]: any } = {};
    updates[`/users/${recipientName}/friends/${senderName}`] = true;
    updates[`/users/${senderName}/friends/${recipientName}`] = true;
    updates[`/users/${recipientName}/friendRequests/${reqKey}`] = null; // Remove request

    await update(ref(database), updates);
};

export const rejectFriendRequest = async (senderName: string, recipientName: string) => {
    const recipientData = await getUserData(recipientName);
    if (!recipientData || !recipientData.friendRequests) return;

    const reqKey = Object.keys(recipientData.friendRequests).find(
        key => recipientData.friendRequests![key].senderName === senderName
    );

    if (reqKey) {
        await remove(ref(database, `users/${recipientName}/friendRequests/${reqKey}`));
    }
};

export const getFriendRequests = async (username: string): Promise<AppUser[]> => {
    const userData = await getUserData(username);
    if (!userData || !userData.friendRequests) return [];
    
    const requestSenders = Object.values(userData.friendRequests).map(req => req.senderName);
    const users: AppUser[] = [];
    for (const sender of requestSenders) {
        const senderData = await getUserData(sender);
        if (senderData) users.push(senderData);
    }
    return users;
};

export const getFriends = async (username: string): Promise<AppUser[]> => {
    const userData = await getUserData(username);
    if (!userData || !userData.friends) return [];

    const friendNames = Object.keys(userData.friends);
    const users: AppUser[] = [];
    for (const name of friendNames) {
        const friendData = await getUserData(name);
        if (friendData) users.push(friendData);
    }
    return users;
};

export const removeFriend = async (currentUsername: string, friendNameToRemove: string) => {
    const updates: { [key: string]: any } = {};
    updates[`/users/${currentUsername}/friends/${friendNameToRemove}`] = null;
    updates[`/users/${friendNameToRemove}/friends/${currentUsername}`] = null;
    await update(ref(database), updates);
};

export const sendRoomInvitation = async (senderName: string, recipientName: string, roomId: string, roomName: string) => {
    const recipientData = await getUserData(recipientName);
    if (!recipientData) throw new Error('المستخدم الذي تحاول دعوته غير موجود.');

    if (recipientData.invitations && Object.values(recipientData.invitations).some(inv => inv.roomId === roomId)) {
        throw new Error(`لقد قمت بالفعل بدعوة ${recipientName} إلى هذه الغرفة.`);
    }

    const invitationsRef = ref(database, `users/${recipientName}/invitations`);
    const newInvitationRef = push(invitationsRef);
    const newInvitation: RoomInvitation = {
        id: newInvitationRef.key!,
        roomId,
        roomName,
        senderName,
        timestamp: Date.now(),
        read: false,
    };
    await set(newInvitationRef, newInvitation);
};

export const getNotifications = async (username: string): Promise<AppNotification[]> => {
    const data = await getUserData(username);
    if (!data) return [];

    const notifications: AppNotification[] = [];

    if (data.friendRequests) {
        Object.entries(data.friendRequests).forEach(([key, req]) => {
            notifications.push({
                id: key, // Use the key from Firebase as the ID
                type: 'friendRequest',
                title: 'طلب صداقة جديد',
                body: `${req.senderName} يريد أن يصبح صديقك.`,
                senderName: req.senderName,
                timestamp: req.timestamp,
                read: req.read,
            });
        });
    }

    if (data.invitations) {
        Object.entries(data.invitations).forEach(([key, inv]) => {
            notifications.push({
                id: key, // Use the key from Firebase as the ID
                type: 'roomInvitation',
                title: `دعوة إلى ${inv.roomName}`,
                body: `${inv.senderName} يدعوك للانضمام.`,
                senderName: inv.senderName,
                roomId: inv.roomId,
                timestamp: inv.timestamp,
                read: inv.read
            });
        });
    }

    return notifications;
};

export const removeNotification = async (username: string, notificationId: string) => {
    const userData = await getUserData(username);
    if (!userData) return;

    if (userData.invitations && userData.invitations[notificationId]) {
        await remove(ref(database, `users/${username}/invitations/${notificationId}`));
    } else if (userData.friendRequests && userData.friendRequests[notificationId]) {
        await remove(ref(database, `users/${username}/friendRequests/${notificationId}`));
    } else {
        // Fallback for old structure if necessary
         if (userData.invitations) {
            const key = Object.keys(userData.invitations).find(k => userData.invitations![k].id === notificationId);
            if(key) await remove(ref(database, `users/${username}/invitations/${key}`));
        }
        if (userData.friendRequests) {
            const key = Object.keys(userData.friendRequests).find(k => userData.friendRequests![k].id === notificationId);
            if(key) await remove(ref(database, `users/${username}/friendRequests/${key}`));
        }
    }
};

type CreateRoomInput = {
    hostName: string;
    roomId: string;
};

export const createRoom = async ({ hostName, roomId }: CreateRoomInput): Promise<string> => {
    const roomRef = ref(database, `rooms/${roomId}`);
    
    const roomData = {
      host: hostName,
      createdAt: serverTimestamp(),
      videoUrl: '',
      backgroundUrl: '',
      seatedMembers: {},
      members: {},
      moderators: [],
    };

    await set(roomRef, roomData);

    return roomId;
};
