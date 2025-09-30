import { firestore, database } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { ref, update, get, set } from 'firebase/database';
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
    friends?: string[];
    friendRequests?: FriendRequest[];
    invitations?: RoomInvitation[];
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


// Collections
const usersCol = collection(firestore, 'users');

// Get a user document
const getUserDoc = async (username: string) => {
    const userRef = doc(firestore, 'users', username);
    const userSnap = await getDoc(userRef);
    return { ref: userRef, snap: userSnap, data: userSnap.data() as AppUser | undefined };
};

// Create or update a user in the 'users' collection
export const upsertUser = async (user: { name: string, avatarId?: string }) => {
    const { ref, snap } = await getUserDoc(user.name);
    if (!snap.exists()) {
        await setDoc(ref, { 
            name: user.name, 
            avatarId: user.avatarId || 'avatar1',
            friends: [],
            friendRequests: [],
            invitations: []
        });
    } else {
        if (user.avatarId && snap.data()?.avatarId !== user.avatarId) {
            await updateDoc(ref, { avatarId: user.avatarId });
        }
    }
};

// Search for users by name
export const searchUsers = async (nameQuery: string, currentUsername: string): Promise<AppUser[]> => {
    const q = query(
        usersCol,
        where('name', '>=', nameQuery),
        where('name', '<=', nameQuery + '\uf8ff'),
        limit(10)
    );

    const querySnapshot = await getDocs(q);
    const users: AppUser[] = [];
    
    const { data: currentUserData } = await getUserDoc(currentUsername);
    if (!currentUserData) return [];
    
    const friendNames = new Set(currentUserData.friends || []);
    const requestSentNames = new Set((await getDocs(query(collection(firestore, 'users'), where('friendRequests', 'array-contains', { senderName: currentUsername, id: '', timestamp: 0 })))).docs.map(d => d.id));


    querySnapshot.forEach((doc) => {
        const userData = doc.data() as AppUser;
        const sentRequestToMe = currentUserData.friendRequests?.some(req => req.senderName === userData.name);

        if (userData.name !== currentUsername && !friendNames.has(userData.name) && !sentRequestToMe) {
            users.push(userData);
        }
    });

    return users;
};

// Send a friend request
export const sendFriendRequest = async (senderName: string, recipientName: string) => {
    const { ref: recipientRef, data: recipientData } = await getUserDoc(recipientName);

    if (!recipientData) {
        throw new Error('المستخدم الذي تحاول إضافته غير موجود.');
    }
    if (recipientData.friendRequests?.some(req => req.senderName === senderName)) {
        throw new Error('لقد أرسلت طلب صداقة لهذا المستخدم بالفعل.');
    }
    if (recipientData.friends?.includes(senderName)) {
        throw new Error('هذا المستخدم صديقك بالفعل.');
    }

    const newRequest: FriendRequest = {
        id: new Date().getTime().toString(),
        senderName,
        timestamp: Date.now(),
        read: false,
    };

    await updateDoc(recipientRef, {
        friendRequests: arrayUnion(newRequest)
    });
};

// Accept a friend request
export const acceptFriendRequest = async (senderName: string, recipientName: string) => {
    const { ref: senderRef } = await getUserDoc(senderName);
    const { ref: recipientRef, data: recipientData } = await getUserDoc(recipientName);

    const requestToRemove = recipientData?.friendRequests?.find(req => req.senderName === senderName);

    const batch = writeBatch(firestore);

    batch.update(recipientRef, {
        friends: arrayUnion(senderName),
        friendRequests: arrayRemove(requestToRemove)
    });
    batch.update(senderRef, {
        friends: arrayUnion(recipientName)
    });

    await batch.commit();
};

// Reject a friend request
export const rejectFriendRequest = async (senderName: string, recipientName: string) => {
    const { ref: recipientRef, data: recipientData } = await getUserDoc(recipientName);
    const requestToRemove = recipientData?.friendRequests?.find(req => req.senderName === senderName);
    if (requestToRemove) {
        await updateDoc(recipientRef, {
            friendRequests: arrayRemove(requestToRemove)
        });
    }
};

// Get pending friend requests for a user
export const getFriendRequests = async (username: string): Promise<AppUser[]> => {
    const { data } = await getUserDoc(username);
    if (!data || !data.friendRequests || data.friendRequests.length === 0) {
        return [];
    }

    const requestUsers: AppUser[] = [];
    for (const request of data.friendRequests) {
        const { data: requestUserData } = await getUserDoc(request.senderName);
        if (requestUserData) {
            requestUsers.push(requestUserData);
        }
    }
    return requestUsers;
};

// Get a user's friends
export const getFriends = async (username: string): Promise<AppUser[]> => {
    const { data } = await getUserDoc(username);
    if (!data || !data.friends || data.friends.length === 0) {
        return [];
    }

    const friendUsers: AppUser[] = [];
    for (const name of data.friends) {
        const { data: friendUserData } = await getUserDoc(name);
        if (friendUserData) {
            friendUsers.push(friendUserData);
        }
    }
    return friendUsers;
};


// Remove a friend
export const removeFriend = async (currentUsername: string, friendNameToRemove: string) => {
    const { ref: currentUserRef } = await getUserDoc(currentUsername);
    const { ref: friendToRemoveRef } = await getUserDoc(friendNameToRemove);

    const batch = writeBatch(firestore);

    batch.update(currentUserRef, {
        friends: arrayRemove(friendNameToRemove)
    });
    batch.update(friendToRemoveRef, {
        friends: arrayRemove(currentUsername)
    });

    await batch.commit();
};

// Send a room invitation
export const sendRoomInvitation = async (senderName: string, recipientName: string, roomId: string, roomName: string) => {
    const { ref: recipientRef, data: recipientData } = await getUserDoc(recipientName);

    if (!recipientData) {
        throw new Error('المستخدم الذي تحاول دعوته غير موجود.');
    }

    const newInvitation: RoomInvitation = {
        id: new Date().getTime().toString(),
        roomId,
        roomName,
        senderName,
        timestamp: Date.now(),
        read: false,
    };
    
    const hasExistingInvitation = recipientData.invitations?.some(inv => inv.roomId === roomId && inv.senderName === senderName);
    if (hasExistingInvitation) {
        throw new Error(`لقد قمت بالفعل بدعوة ${recipientName} إلى هذه الغرفة.`);
    }

    await updateDoc(recipientRef, {
        invitations: arrayUnion(newInvitation)
    });
    
    const roomRefRtdb = ref(database, `rooms/${roomId}`);
    const roomSnapshot = await get(roomRefRtdb);
    if (roomSnapshot.exists() && roomSnapshot.val().isPrivate) {
        const updates: { [key: string]: any } = {};
        updates[`authorizedMembers/${recipientName}`] = true;
        await update(roomRefRtdb, updates);
    }
};

// Get all notifications for a user
export const getNotifications = async (username: string): Promise<AppNotification[]> => {
    const { data } = await getUserDoc(username);
    if (!data) return [];

    const notifications: AppNotification[] = [];

    if (data.friendRequests) {
        for (const req of data.friendRequests) {
            notifications.push({
                id: req.id,
                type: 'friendRequest',
                title: 'طلب صداقة جديد',
                body: `${req.senderName} يريد أن يصبح صديقك.`,
                senderName: req.senderName,
                timestamp: req.timestamp,
                read: req.read,
            });
        }
    }

    if (data.invitations) {
        for (const inv of data.invitations) {
            notifications.push({
                id: inv.id,
                type: 'roomInvitation',
                title: `دعوة إلى ${inv.roomName}`,
                body: `${inv.senderName} يدعوك للانضمام.`,
                senderName: inv.senderName,
                roomId: inv.roomId,
                timestamp: inv.timestamp,
                read: inv.read
            });
        }
    }

    return notifications;
};

// Remove a specific notification
export const removeNotification = async (username: string, notificationId: string) => {
    const { ref, data } = await getUserDoc(username);
    if (!data) return;

    const newInvitations = data.invitations?.filter(inv => inv.id !== notificationId) ?? [];
    const newFriendRequests = data.friendRequests?.filter(req => req.id !== notificationId) ?? [];

    await updateDoc(ref, {
        invitations: newInvitations,
        friendRequests: newFriendRequests
    });
};


// Create a new room
type CreateRoomInput = {
    hostName: string;
    avatarId: string;
    isPrivate: boolean;
};

export const createRoom = async ({ hostName, avatarId, isPrivate }: CreateRoomInput): Promise<string> => {
    const newRoomId = uuidv4();
    const roomRef = ref(database, `rooms/${newRoomId}`);
    
    const roomData = {
      host: hostName,
      createdAt: Date.now(),
      videoUrl: '',
      seatedMembers: {},
      members: {},
      isPrivate: isPrivate,
      authorizedMembers: isPrivate ? { [hostName]: true } : {},
      moderators: [],
      playlist: [],
    };

    await set(roomRef, roomData);

    return newRoomId;
};
