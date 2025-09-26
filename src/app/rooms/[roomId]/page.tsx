import RoomClient from "@/components/room/RoomClient";

type RoomPageProps = {
  params: {
    roomId: string;
  };
};

export default function RoomPage({ params }: RoomPageProps) {
  return <RoomClient roomId={params.roomId} />;
}
