package com.rentcar.rent_car.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserConnectionServiceTest {

    private UserConnectionService userConnectionService;

    @BeforeEach
    void setUp() {
        userConnectionService = new UserConnectionService();
    }

    @Test
    void shouldTrackUserConnectionAndOnlineStatus() {
        Long userId = 100L;
        String session1 = "session-1";
        String session2 = "session-2";

        assertThat(userConnectionService.isUserOnline(userId)).isFalse();

        userConnectionService.userConnected(userId, session1);
        assertThat(userConnectionService.isUserOnline(userId)).isTrue();

        userConnectionService.userConnected(userId, session2);
        assertThat(userConnectionService.isUserOnline(userId)).isTrue();

        Long disconnectedUser1 = userConnectionService.userDisconnected(session1);
        assertThat(disconnectedUser1).isEqualTo(userId);
        assertThat(userConnectionService.isUserOnline(userId)).isTrue(); // Still has session2

        Long disconnectedUser2 = userConnectionService.userDisconnected(session2);
        assertThat(disconnectedUser2).isEqualTo(userId);
        assertThat(userConnectionService.isUserOnline(userId)).isFalse(); // No more sessions
    }

    @Test
    void shouldReturnNullWhenDisconnectingUnknownSession() {
        Long result = userConnectionService.userDisconnected("unknown-session");
        assertThat(result).isNull();
    }
}
