"""connect_proxy.py — 本地 TCP → HTTP CONNECT 代理转发器
用法: python connect_proxy.py <listen_port> <target_host> <target_port>
      （代理地址默认 127.0.0.1:8686，可用环境变量 CONNECT_PROXY 覆盖）
用途: 让不支持代理的客户端（ssh -R、node net.connect 等）通过 HTTP CONNECT 代理建立 TCP 连接
"""
import os
import socket
import sys
import threading


def main() -> None:
    listen_port = int(sys.argv[1])
    target_host = sys.argv[2]
    target_port = int(sys.argv[3])
    proxy = os.environ.get("CONNECT_PROXY", "127.0.0.1:8686")
    proxy_host, proxy_port = proxy.rsplit(":", 1)
    proxy_port = int(proxy_port)

    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", listen_port))
    srv.listen(16)
    print(f"listening 127.0.0.1:{listen_port} -> proxy {proxy_host}:{proxy_port} -> {target_host}:{target_port}")

    def forward(src: socket.socket, dst: socket.socket) -> None:
        try:
            while True:
                data = src.recv(65536)
                if not data:
                    break
                dst.sendall(data)
        except OSError:
            pass
        finally:
            try:
                dst.shutdown(socket.SHUT_WR)
            except OSError:
                pass

    def handle(conn: socket.socket) -> None:
        try:
            p = socket.create_connection((proxy_host, proxy_port), timeout=20)
            req = f"CONNECT {target_host}:{target_port} HTTP/1.1\r\nHost: {target_host}:{target_port}\r\n\r\n"
            p.sendall(req.encode())
            resp = b""
            while b"\r\n\r\n" not in resp:
                chunk = p.recv(4096)
                if not chunk:
                    break
                resp += chunk
            status_line = resp.split(b"\r\n", 1)[0].decode(errors="replace")
            if " 200 " not in status_line:
                print(f"CONNECT failed: {status_line}")
                conn.close()
                return
            t1 = threading.Thread(target=forward, args=(conn, p), daemon=True)
            t2 = threading.Thread(target=forward, args=(p, conn), daemon=True)
            t1.start()
            t2.start()
            t1.join()
            t2.join()
        except Exception as e:  # noqa: BLE001
            print(f"ERR: {e}")
        finally:
            try:
                conn.close()
            except OSError:
                pass

    while True:
        conn, _ = srv.accept()
        threading.Thread(target=handle, args=(conn,), daemon=True).start()


if __name__ == "__main__":
    main()
