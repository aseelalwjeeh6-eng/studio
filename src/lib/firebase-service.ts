import { firestore } from './firebase';
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

export interface AppUser {
    name: string;
    avatarId?: string;
    friends?: string[];
    friendRequests?: string[];
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
            friendRequests: []
        });
    } else {
        // Update avatar if it has changed
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
    const requestNames = new Set(currentUserData.friendRequests || []);

    querySnapshot.forEach((doc) => {
        const userData = doc.data() as AppUser;
        // Exclude current user, existing friends, and users who have sent a request
        if (userData.name !== currentUsername && !friendNames.has(userData.name) && !requestNames.has(userData.name)) {
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
    if (recipientData.friendRequests?.includes(senderName)) {
        throw new Error('لقد أرسلت طلب صداقة لهذا المستخدم بالفعل.');
    }
    if (recipientData.friends?.includes(senderName)) {
        throw new Error('هذا المستخدم صديقك بالفعل.');
    }

    await updateDoc(recipientRef, {
        friendRequests: arrayUnion(senderName)
    });
};

// Accept a friend request
export const acceptFriendRequest = async (senderName: string, recipientName: string) => {
    const { ref: senderRef } = await getUserDoc(senderName);
    const { ref: recipientRef } = await getUserDoc(recipientName);

    const batch = writeBatch(firestore);

    // Add each user to the other's friends list
    batch.update(recipientRef, {
        friends: arrayUnion(senderName),
        friendRequests: arrayRemove(senderName)
    });
    batch.update(senderRef, {
        friends: arrayUnion(recipientName)
    });

    await batch.commit();
};

// Reject a friend request
export const rejectFriendRequest = async (senderName: string, recipientName: string) => {
    const { ref: recipientRef } = await getUserDoc(recipientName);
    await updateDoc(recipientRef, {
        friendRequests: arrayRemove(senderName)
    });
};

// Get pending friend requests for a user
export const getFriendRequests = async (username: string): Promise<AppUser[]> => {
    const { data } = await getUserDoc(username);
    if (!data || !data.friendRequests || data.friendRequests.length === 0) {
        return [];
    }

    const requestUsers: AppUser[] = [];
    for (const name of data.friendRequests) {
        const { data: requestUserData } = await getUserDoc(name);
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
