import { ChatBubble, Spinner } from "@medusajs/icons"
import { Avatar, Text, clx } from "@medusajs/ui"
import { MatrixEvent, NotificationCountType, Room } from "matrix-js-sdk"
import { useEffect, useState } from "react"

import { useMatrix, useMatrixRooms } from "../../providers/matrix-provider"
import { messagePreview } from "./matrix-cards"
import { formatSmartTimestamp, initials } from "./matrix-utils"
import { MatrixChat } from "./matrix-chat"

const lastMessageEvent = (room: Room): MatrixEvent | null => {
  const events = room.getLiveTimeline().getEvents()
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].getType() === "m.room.message" && !events[i].isRedacted()) {
      return events[i]
    }
  }
  return null
}

/**
 * Two-pane conversation inbox over the Matrix room list — a drop-in
 * replacement for the TalkJS <Inbox>.
 */
export const MatrixInbox = ({ className }: { className?: string }) => {
  const { client, ready } = useMatrix()
  const rooms = useMatrixRooms()
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].roomId)
    }
  }, [rooms, selectedRoomId])

  if (!client || !ready) {
    return (
      <div className={clx("flex h-full items-center justify-center", className)}>
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div
        className={clx(
          "flex h-full flex-col items-center justify-center gap-y-2",
          className
        )}
      >
        <ChatBubble className="text-ui-fg-muted" />
        <Text size="small" className="text-ui-fg-muted">
          No conversations yet
        </Text>
      </div>
    )
  }

  return (
    <div className={clx("flex h-full overflow-hidden", className)}>
      <div className="border-ui-border-base w-72 shrink-0 overflow-y-auto border-r">
        {rooms.map((room) => {
          const last = lastMessageEvent(room)
          const unread = room.getUnreadNotificationCount(
            NotificationCountType.Total
          )
          const selected = room.roomId === selectedRoomId
          const own = last?.getSender() === client.getUserId()
          const preview = last
            ? `${own ? "You: " : ""}${messagePreview(last.getContent())}`
            : "No messages yet"

          return (
            <button
              key={room.roomId}
              onClick={() => setSelectedRoomId(room.roomId)}
              className={clx(
                "border-ui-border-base hover:bg-ui-bg-base-hover flex w-full items-center gap-x-3 border-b px-4 py-3 text-left transition-colors",
                { "bg-ui-bg-base-pressed": selected }
              )}
            >
              <Avatar fallback={initials(room.name)} />
              <div className="min-w-0 flex-1">
                <div className="flex w-full items-center justify-between gap-x-2">
                  <Text
                    size="small"
                    weight={unread > 0 ? "plus" : "regular"}
                    className="truncate"
                  >
                    {room.name}
                  </Text>
                  {last && (
                    <Text size="xsmall" className="text-ui-fg-muted shrink-0">
                      {formatSmartTimestamp(last.getTs())}
                    </Text>
                  )}
                </div>
                <div className="flex w-full items-center justify-between gap-x-2">
                  <Text
                    size="xsmall"
                    className={clx("truncate", {
                      "text-ui-fg-base font-medium": unread > 0,
                      "text-ui-fg-subtle": unread === 0,
                    })}
                  >
                    {preview}
                  </Text>
                  {unread > 0 && (
                    <span className="bg-ui-bg-interactive text-ui-fg-on-color flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs">
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="min-w-0 flex-1 px-4">
        {selectedRoomId ? (
          <MatrixChat roomId={selectedRoomId} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Text size="small" className="text-ui-fg-muted">
              Select a conversation
            </Text>
          </div>
        )}
      </div>
    </div>
  )
}
