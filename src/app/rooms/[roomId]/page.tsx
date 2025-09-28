import RoomClient from "@/components/room/RoomClient";

type RoomPageProps = {
  params: {
    roomId: string;
  };
};

export default function RoomPage({ params }: RoomPageProps) {
  // We remove the main layout from this page to have a custom one
  return <RoomClient roomId={params.roomId} />;
}
