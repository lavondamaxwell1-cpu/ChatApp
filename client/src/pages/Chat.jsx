import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import api from "../api/api";
import { useAuth } from "../context/useAuth";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

export default function Chat() {
  const { user } = useAuth();

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [users, setUsers] = useState([]);
  const [trustedUsers, setTrustedUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [typingUser, setTypingUser] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const bottomRef = useRef(null);

  const room =
    user && selectedUser
      ? [user._id, selectedUser._id].sort().join("_")
      : "general";

  const isUserOnline = (userId) => {
    return onlineUsers.some((u) => u.userId === userId);
  };

  const isTrusted = (userId) => {
    return trustedUsers.some((u) => u._id === userId);
  };

  const loadTrustedCircle = async () => {
    if (!user) return;

    try {
      const res = await api.get(`/api/trust/circle/${user._id}`);
      setTrustedUsers(res.data);
    } catch (error) {
      console.log(
        "LOAD TRUSTED CIRCLE ERROR:",
        error.response?.data || error.message,
      );
    }
  };

  const loadRequests = async () => {
    if (!user) return;

    try {
      const res = await api.get(`/api/trust/requests/${user._id}`);
      setRequests(res.data);
    } catch (error) {
      console.log(
        "LOAD REQUESTS ERROR:",
        error.response?.data || error.message,
      );
    }
  };

  const sendTrustRequest = async (toUserId) => {
    try {
      await api.post(`/api/trust/request/${toUserId}`, {
        fromUserId: user._id,
      });

      alert("Trusted Circle request sent");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to send request");
    }
  };

  const approveRequest = async (requestId) => {
    try {
      await api.post(`/api/trust/approve/${user._id}/${requestId}`);
      await loadTrustedCircle();
      await loadRequests();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to approve request");
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await api.post(`/api/trust/reject/${user._id}/${requestId}`);
      await loadRequests();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to reject request");
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/api/users");
        setUsers(res.data.filter((u) => u._id !== user?._id));
      } catch (error) {
        console.log("LOAD USERS ERROR:", error.response?.data || error.message);
      }
    };

    if (user) {
      fetchUsers();
      loadTrustedCircle();
      loadRequests();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    socket.emit("addOnlineUser", user._id);

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("onlineUsers");
    };
  }, [user]);

  useEffect(() => {
    if (!room) return;

    socket.emit("joinRoom", room);

    socket.on("roomMessages", (messages) => {
      setChat(messages);
    });

    socket.on("receiveMessage", (newMessage) => {
      setChat((prev) => [...prev, newMessage]);
    });

    socket.on("userTyping", (username) => {
      if (username !== user?.username) {
        setTypingUser(username);
      }
    });

    socket.on("userStopTyping", () => {
      setTypingUser("");
    });

    return () => {
      socket.off("roomMessages");
      socket.off("receiveMessage");
      socket.off("userTyping");
      socket.off("userStopTyping");
    };
  }, [room, user?.username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!user || !selectedUser) return;

    socket.emit("typing", {
      room,
      username: user.username,
    });

    setTimeout(() => {
      socket.emit("stopTyping", { room });
    }, 1000);
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    if (!user) {
      alert("Please login first");
      return;
    }

    if (!selectedUser) {
      alert("Pick someone to message first");
      return;
    }

    if (!isTrusted(selectedUser._id)) {
      alert("This person is not in your Trusted Circle yet.");
      return;
    }

    socket.emit("sendMessage", {
      userId: user._id,
      username: user.username,
      room,
      text: message,
    });

    setMessage("");
    setShowEmojiPicker(false);
    socket.emit("stopTyping", { room });
  };

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex border border-slate-200">
        <aside className="w-80 bg-[#f9f9fb] border-r border-slate-200 flex flex-col">
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Trusted Circle
                </h1>
                <p className="text-xs text-slate-500">
                  Logged in as {user?.username}
                </p>
              </div>

              <button
                onClick={logout}
                className="text-sm font-semibold text-blue-500 hover:text-blue-600"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {requests.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase text-slate-400 mb-2">
                  Requests
                </h2>

                <div className="space-y-2">
                  {requests.map((request) => (
                    <div
                      key={request._id}
                      className="rounded-2xl bg-white border border-slate-200 p-3"
                    >
                      <p className="font-semibold text-slate-900">
                        {request.from?.username}
                      </p>
                      <p className="text-xs text-slate-500">
                        wants to join your Trusted Circle
                      </p>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => approveRequest(request._id)}
                          className="flex-1 rounded-full bg-green-500 text-white text-xs py-2 font-semibold"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => rejectRequest(request._id)}
                          className="flex-1 rounded-full bg-slate-200 text-slate-700 text-xs py-2 font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xs font-bold uppercase text-slate-400 mb-2">
                My Trusted Circle
              </h2>

              {trustedUsers.length === 0 ? (
                <p className="text-sm text-slate-400 px-2">
                  No trusted contacts yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {trustedUsers.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => {
                        setSelectedUser(u);
                        setChat([]);
                        setTypingUser("");
                        setMessage("");
                        setShowEmojiPicker(false);
                      }}
                      className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition ${
                        selectedUser?._id === u._id
                          ? "bg-blue-100"
                          : "hover:bg-slate-100"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                          {u.username?.[0]?.toUpperCase()}
                        </div>

                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            isUserOnline(u._id)
                              ? "bg-green-500"
                              : "bg-slate-300"
                          }`}
                        ></span>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          {u.username}
                        </p>
                        <p className="text-xs text-slate-500">
                          {isUserOnline(u._id) ? "Online" : "Offline"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase text-slate-400 mb-2">
                Add Trusted Contact
              </h2>

              <div className="space-y-2">
                {users
                  .filter((u) => !isTrusted(u._id))
                  .map((u) => (
                    <div
                      key={u._id}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl p-3 bg-white border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-300 text-white flex items-center justify-center font-bold">
                          {u.username?.[0]?.toUpperCase()}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {u.username}
                          </p>
                          <p className="text-xs text-slate-500">{u.role}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => sendTrustRequest(u._id)}
                        className="rounded-full bg-blue-500 text-white text-xs px-3 py-2 font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">
                  Select a Trusted Contact
                </h2>
                <p className="text-slate-500 mt-2">
                  Add and approve trusted contacts before chatting.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-[#f9f9fb]/95 backdrop-blur border-b border-slate-200 px-5 py-4 flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    {selectedUser.username?.[0]?.toUpperCase()}
                  </div>

                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      isUserOnline(selectedUser._id)
                        ? "bg-green-500"
                        : "bg-slate-300"
                    }`}
                  ></span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedUser.username}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isUserOnline(selectedUser._id) ? "Online" : "Offline"}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2 bg-white">
                {chat.map((msg, index) => {
                  const isMe = msg.user === user?._id;

                  return (
                    <div
                      key={msg._id || index}
                      className={`flex flex-col ${
                        isMe ? "items-end" : "items-start"
                      }`}
                    >
                      {!isMe && (
                        <p className="ml-3 mb-1 text-[11px] font-medium text-slate-400">
                          {msg.username}
                        </p>
                      )}

                      <div
                        className={`max-w-[75%] px-4 py-2 text-[15px] leading-snug shadow-sm ${
                          isMe
                            ? "bg-[#007aff] text-white rounded-[1.35rem] rounded-br-md"
                            : "bg-[#e9e9eb] text-black rounded-[1.35rem] rounded-bl-md"
                        }`}
                      >
                        {msg.text}
                      </div>

                      <p className="mx-3 mt-1 text-[10px] text-slate-400">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  );
                })}

                {typingUser && (
                  <div className="flex items-start">
                    <div className="bg-[#e9e9eb] rounded-[1.35rem] rounded-bl-md px-4 py-3 flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef}></div>
              </div>

              <div className="border-t border-slate-200 bg-[#f9f9fb] p-3 relative">
                {showEmojiPicker && (
                  <div className="absolute bottom-16 left-4 z-50">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </div>
                )}

                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-full px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="text-xl"
                  >
                    😊
                  </button>

                  <input
                    value={message}
                    onChange={handleTyping}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                    placeholder={`Message ${selectedUser.username}`}
                    className="flex-1 bg-transparent outline-none text-[15px]"
                  />

                  <button
                    onClick={sendMessage}
                    className="w-8 h-8 rounded-full bg-[#007aff] text-white font-bold flex items-center justify-center hover:bg-blue-600"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
